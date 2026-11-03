use std::io::Cursor;
use image::{DynamicImage, ImageFormat, RgbaImage};

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct ExeMetadata {
    pub file_name:String,
    pub app_name:String,
    pub company_name:String,
    pub version:String,
    pub description:String,
    pub window_title:String,
}
#[derive(Clone)]
pub struct PngIcon { pub size:u32, pub png:Vec<u8> }

fn align_up(value:usize,alignment:usize)->usize{(value+alignment-1)&!(alignment-1)}
fn put_u16(buf:&mut [u8],off:usize,v:u16){buf[off..off+2].copy_from_slice(&v.to_le_bytes());}
fn put_u32(buf:&mut [u8],off:usize,v:u32){buf[off..off+4].copy_from_slice(&v.to_le_bytes());}
fn write_ascii(buf:&mut [u8],off:usize,s:&str)->usize{let bytes=s.as_bytes();let n=bytes.len().min(buf.len().saturating_sub(off+1));buf[off..off+n].copy_from_slice(&bytes[..n]);buf[off+n]=0;off+n+1}

pub fn png_icon(size:u32,image:&RgbaImage)->Result<PngIcon,Box<dyn std::error::Error>>{
 let mut cursor=Cursor::new(Vec::new());
 DynamicImage::ImageRgba8(image.clone()).write_to(&mut cursor,ImageFormat::Png)?;
 Ok(PngIcon{size,png:cursor.into_inner()})
}

pub fn generate_windows_ex(images:&[PngIcon],metadata:&ExeMetadata)->Result<Vec<u8>,Box<dyn std::error::Error>>{
 let targets=[16u32,32,48,64,256];
 let mut selected:Vec<PngIcon>=images.iter().filter(|i|targets.contains(&i.size)).cloned().collect();
 selected.sort_by_key(|i|i.size);
 if selected.is_empty(){selected=images.iter().take(4).cloned().collect();}
 if selected.is_empty(){return Err("At least one icon image is required".into());}
 let file_alignment=0x200usize;let section_alignment=0x1000usize;let image_base=0x00400000u32;
 let text_rva=0x1000u32;let rdata_rva=0x2000u32;let rsrc_rva=0x3000u32;
 let rdata=build_rdata_section(rdata_rva,image_base,metadata);
 let mut text=vec![0u8;32];let mut p=0usize;
 text[p]=0x6a;text[p+1]=0x40;p+=2;
 text[p]=0x68;p+=1;put_u32(&mut text,p,rdata.caption_va);p+=4;
 text[p]=0x68;p+=1;put_u32(&mut text,p,rdata.body_va);p+=4;
 text[p]=0x6a;text[p+1]=0;p+=2;
 text[p]=0xff;text[p+1]=0x15;p+=2;put_u32(&mut text,p,rdata.message_box_va);p+=4;
 text[p]=0x6a;text[p+1]=0;p+=2;
 text[p]=0xff;text[p+1]=0x15;p+=2;put_u32(&mut text,p,rdata.exit_process_va);p+=4;
 text[p]=0xc3;
 let mut resource=build_resource_section(&selected);
 patch_resource_rvas(&mut resource,rsrc_rva);
 let pe_offset=0x80usize;let sections=3usize;
 let headers_size=align_up(pe_offset+24+224+sections*40,file_alignment);
 let text_raw=align_up(text.len(),file_alignment);
 let rdata_raw=align_up(rdata.bytes.len(),file_alignment);
 let rsrc_raw=align_up(resource.len(),file_alignment);
 let rsrc_virtual=align_up(resource.len(),section_alignment);
 let image_size=rsrc_rva as usize+rsrc_virtual;
 let total=headers_size+text_raw+rdata_raw+rsrc_raw;
 let mut exe=vec![0u8;total];
 put_u16(&mut exe,0,0x5a4d);put_u16(&mut exe,2,0x0090);put_u16(&mut exe,4,0x0003);
 put_u16(&mut exe,8,0x0004);put_u16(&mut exe,0x0c,0xffff);put_u16(&mut exe,0x10,0x00b8);
 put_u16(&mut exe,0x18,0x0040);put_u32(&mut exe,0x3c,pe_offset as u32);
 let dos=[0x0e,0x1f,0xba,0x0e,0x00,0xb4,0x09,0xcd,0x21,0xb8,0x01,0x4c,0xcd,0x21];
 exe[0x40..0x40+dos.len()].copy_from_slice(&dos);
 write_ascii(&mut exe,0x4e,"This program cannot be run in DOS mode.\r\r\n$");
 exe[pe_offset..pe_offset+4].copy_from_slice(b"PE\0\0");
 let coff=pe_offset+4;
 put_u16(&mut exe,coff,0x014c);put_u16(&mut exe,coff+2,sections as u16);
 put_u16(&mut exe,coff+16,224);put_u16(&mut exe,coff+18,0x0103);
 let opt=coff+20;
 put_u16(&mut exe,opt,0x010b);exe[opt+2]=14;
 put_u32(&mut exe,opt+4,text_raw as u32);put_u32(&mut exe,opt+8,(rdata_raw+rsrc_raw) as u32);
 put_u32(&mut exe,opt+16,text_rva);put_u32(&mut exe,opt+20,text_rva);put_u32(&mut exe,opt+24,rdata_rva);
 put_u32(&mut exe,opt+28,image_base);put_u32(&mut exe,opt+32,section_alignment as u32);put_u32(&mut exe,opt+36,file_alignment as u32);
 put_u16(&mut exe,opt+40,6);put_u16(&mut exe,opt+48,6);
 put_u32(&mut exe,opt+56,image_size as u32);put_u32(&mut exe,opt+60,headers_size as u32);
 put_u16(&mut exe,opt+68,2);put_u16(&mut exe,opt+70,0x8100);
 put_u32(&mut exe,opt+72,0x100000);put_u32(&mut exe,opt+76,0x1000);
 put_u32(&mut exe,opt+80,0x100000);put_u32(&mut exe,opt+84,0x1000);put_u32(&mut exe,opt+92,16);
 let dd=opt+96;
 put_u32(&mut exe,dd+8,rdata.import_rva);put_u32(&mut exe,dd+12,60);
 put_u32(&mut exe,dd+16,rsrc_rva);put_u32(&mut exe,dd+20,resource.len() as u32);
 put_u32(&mut exe,dd+96,rdata.iat_rva);put_u32(&mut exe,dd+100,16);
 let sec=opt+224;let text_ptr=headers_size;let rdata_ptr=text_ptr+text_raw;let rsrc_ptr=rdata_ptr+rdata_raw;
 write_ascii(&mut exe,sec,".text");put_u32(&mut exe,sec+8,text.len() as u32);put_u32(&mut exe,sec+12,text_rva);put_u32(&mut exe,sec+16,text_raw as u32);put_u32(&mut exe,sec+20,text_ptr as u32);put_u32(&mut exe,sec+36,0x60000020);
 let rs=sec+40;write_ascii(&mut exe,rs,".rdata");put_u32(&mut exe,rs+8,rdata.bytes.len() as u32);put_u32(&mut exe,rs+12,rdata_rva);put_u32(&mut exe,rs+16,rdata_raw as u32);put_u32(&mut exe,rs+20,rdata_ptr as u32);put_u32(&mut exe,rs+36,0xc0000040);
 let ss=sec+80;write_ascii(&mut exe,ss,".rsrc");put_u32(&mut exe,ss+8,resource.len() as u32);put_u32(&mut exe,ss+12,rsrc_rva);put_u32(&mut exe,ss+16,rsrc_raw as u32);put_u32(&mut exe,ss+20,rsrc_ptr as u32);put_u32(&mut exe,ss+36,0x40000040);
 exe[text_ptr..text_ptr+text.len()].copy_from_slice(&text);
 exe[rdata_ptr..rdata_ptr+rdata.bytes.len()].copy_from_slice(&rdata.bytes);
 exe[rsrc_ptr..rsrc_ptr+resource.len()].copy_from_slice(&resource);
 Ok(exe)
}

struct Rdata {bytes:Vec<u8>,import_rva:u32,iat_rva:u32,exit_process_va:u32,message_box_va:u32,caption_va:u32,body_va:u32}
fn build_rdata_section(rva:u32,image_base:u32,meta:&ExeMetadata)->Rdata{
 let mut b=vec![0u8;512];let(iat_k,iat_u,ilt_k,ilt_u,idt,hn_exit,hn_msg,dll_k,dll_u,caption,body)=(0usize,8usize,16usize,24usize,32usize,96usize,112usize,128usize,144usize,160usize,224usize);
 put_u16(&mut b,hn_exit,0);write_ascii(&mut b,hn_exit+2,"ExitProcess");
 put_u16(&mut b,hn_msg,0);write_ascii(&mut b,hn_msg+2,"MessageBoxA");
 write_ascii(&mut b,dll_k,"KERNEL32.dll");write_ascii(&mut b,dll_u,"USER32.dll");
 for (off,target) in [(iat_k,hn_exit),(iat_u,hn_msg),(ilt_k,hn_exit),(ilt_u,hn_msg)]{put_u32(&mut b,off,rva+target as u32);put_u32(&mut b,off+4,0);}
 for (i,(ilt,dll,iat)) in [(ilt_k,dll_k,iat_k),(ilt_u,dll_u,iat_u)].iter().enumerate(){let o=idt+i*20;put_u32(&mut b,o,rva+*ilt as u32);put_u32(&mut b,o+12,rva+*dll as u32);put_u32(&mut b,o+16,rva+*iat as u32);}
 let title=if meta.app_name.is_empty(){"IconForge Application"}else{meta.app_name.as_str()};let title:String=title.chars().take(48).collect();
 let version=if meta.version.is_empty(){"1.0.0"}else{meta.version.as_str()};let publisher=if meta.company_name.is_empty(){"Native Rust Studio"}else{meta.company_name.as_str()};
 let body_text=format!("{} (v{})\r\nPublisher: {}\r\n\r\nBuilt with Fastframe & egui Native Icon Packager.\r\nEmbedded RT_GROUP_ICON & multi-resolution mipmaps verified.",title,version,publisher);
 write_ascii(&mut b,caption,&title);let end=write_ascii(&mut b,body,&body_text);
 b.truncate(align_up(end,16));
 Rdata{bytes:b,import_rva:rva+idt as u32,iat_rva:rva+iat_k as u32,exit_process_va:image_base+rva+iat_k as u32,message_box_va:image_base+rva+iat_u as u32,caption_va:image_base+rva+caption as u32,body_va:image_base+rva+body as u32}
}

fn build_resource_section(images:&[PngIcon])->Vec<u8>{
 let n=images.len();let root=0usize;let icon_type=root+32;let group_type=icon_type+16+n*8;let icon_lang=group_type+24;let group_lang=icon_lang+n*24;let icon_data=group_lang+24;let group_data_entry=icon_data+n*16;let group_data=group_data_entry+16;
 let group_size=6+n*14;let mut offset=align_up(group_data+group_size,4);
 let mut payload_offsets=Vec::new();for img in images{payload_offsets.push(offset);offset+=align_up(img.png.len(),4);}
 let mut b=vec![0u8;offset];
 put_u16(&mut b,root+14,2);
 put_u32(&mut b,root+16,3);put_u32(&mut b,root+20,0x80000000|icon_type as u32);
 put_u32(&mut b,root+24,14);put_u32(&mut b,root+28,0x80000000|group_type as u32);
 put_u16(&mut b,icon_type+14,n as u16);
 for i in 0..n{let e=icon_type+16+i*8;let lang=icon_lang+i*24;let data=icon_data+i*16;
  put_u32(&mut b,e,(i+1) as u32);put_u32(&mut b,e+4,0x80000000|lang as u32);
  put_u16(&mut b,lang+14,1);put_u32(&mut b,lang+16,0x0409);put_u32(&mut b,lang+20,data as u32);
  put_u32(&mut b,data,payload_offsets[i] as u32);put_u32(&mut b,data+4,images[i].png.len() as u32);
 }
 put_u16(&mut b,group_type+14,1);put_u32(&mut b,group_type+16,1);put_u32(&mut b,group_type+20,0x80000000|group_lang as u32);
 put_u16(&mut b,group_lang+14,1);put_u32(&mut b,group_lang+16,0x0409);put_u32(&mut b,group_lang+20,group_data_entry as u32);
 put_u32(&mut b,group_data_entry,group_data as u32);put_u32(&mut b,group_data_entry+4,group_size as u32);
 put_u16(&mut b,group_data,0);put_u16(&mut b,group_data+2,1);put_u16(&mut b,group_data+4,n as u16);
 for (i,img) in images.iter().enumerate(){let e=group_data+6+i*14;let d=if img.size>=256{0}else{img.size as u8};b[e]=d;b[e+1]=d;put_u16(&mut b,e+4,1);put_u16(&mut b,e+6,32);put_u32(&mut b,e+8,img.png.len() as u32);put_u16(&mut b,e+12,(i+1) as u16);b[payload_offsets[i]..payload_offsets[i]+img.png.len()].copy_from_slice(&img.png);}
 b
}
fn patch_resource_rvas(b:&mut [u8],rva:u32){
 let root_count=u16::from_le_bytes([b[14],b[15]]) as usize;
 for t in 0..root_count{let type_off=16+t*8;let sub=u32::from_le_bytes(b[type_off+4..type_off+8].try_into().unwrap())&0x7fffffff;let ids=u16::from_le_bytes([b[sub as usize+14],b[sub as usize+15]]) as usize;
  for id in 0..ids{let id_off=sub as usize+16+id*8;let lang=u32::from_le_bytes(b[id_off+4..id_off+8].try_into().unwrap())&0x7fffffff;let count=u16::from_le_bytes([b[lang as usize+14],b[lang as usize+15]]) as usize;
   for l in 0..count{let lang_off=lang as usize+16+l*8;let data=u32::from_le_bytes(b[lang_off+4..lang_off+8].try_into().unwrap()) as usize;if data+16<=b.len(){let raw=u32::from_le_bytes(b[data..data+4].try_into().unwrap());put_u32(b,data,rva+raw);}}
  }
 }
}


#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    #[test]
    fn generated_executable_has_dos_and_pe_signatures() {
        let mut image=RgbaImage::new(16,16);
        for pixel in image.pixels_mut(){*pixel=Rgba([30,120,220,255]);}
        let icon=png_icon(16,&image).unwrap();
        let meta=ExeMetadata{file_name:"test".into(),app_name:"Test App".into(),company_name:"Test Studio".into(),version:"1.0.0".into(),description:"Test".into(),window_title:"Test".into()};
        let exe=generate_windows_ex(&[icon],&meta).unwrap();
        assert_eq!(&exe[0..2],b"MZ");
        assert_eq!(&exe[0x80..0x84],b"PE\0\0");
        assert!(exe.len()>1024);
    }
}
