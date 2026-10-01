'use strict';
(()=>{const art=window.PixelStudio;if(!art)return;const icons={};window.PixelSkillArt34=icons;
const pending=Object.entries(window.PIXEL_SKILLS34||{}).map(([id,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const c=art.surface(512),x=c.getContext('2d');x.drawImage(im,0,0,512,512);icons[id]=c;resolve();};im.onerror=()=>reject(new Error('Skillbild nicht geladen: '+id));im.src=src;}));art.ready=Promise.all([art.ready,...pending]);})();
