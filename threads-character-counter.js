(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    const input=document.getElementById('draftText');
    const mode=document.getElementById('lengthMode');
    const used=document.getElementById('usedCount');
    const limitDisplay=document.getElementById('limitCount');
    const charOutput=document.getElementById('characters');
    const noSpaceOutput=document.getElementById('charactersNoSpaces');
    const wordOutput=document.getElementById('words');
    const lineOutput=document.getElementById('lines');
    const status=document.getElementById('counterStatus');
    const track=document.getElementById('characterTrack');
    const fill=document.getElementById('characterTrackFill');
    const copy=document.getElementById('copyDraft');
    const clear=document.getElementById('clearDraft');
    if(!input||!mode||!used||!limitDisplay||!charOutput||!noSpaceOutput||!wordOutput||!lineOutput||!status||!track||!fill||!copy||!clear)return;
    const segmenter=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
    const countGraphemes=text=>segmenter?Array.from(segmenter.segment(text),part=>part.segment):Array.from(text);
    const numberFormat=new Intl.NumberFormat();
    function update(){
      const text=input.value;
      const graphemes=countGraphemes(text);
      const count=graphemes.length;
      const withoutWhitespace=graphemes.filter(part=>!/^\s+$/u.test(part)).length;
      const words=text.trim()?text.trim().split(/\s+/u).length:0;
      const lineCount=text.length?text.split(/\r\n|\r|\n/).length:0;
      const limit=Number(mode.value)||500;
      const remaining=limit-count;
      charOutput.textContent=numberFormat.format(count);
      noSpaceOutput.textContent=numberFormat.format(withoutWhitespace);
      wordOutput.textContent=numberFormat.format(words);
      lineOutput.textContent=numberFormat.format(lineCount);
      used.textContent=numberFormat.format(count);
      limitDisplay.textContent=numberFormat.format(limit);
      track.setAttribute('aria-valuemax',String(limit));
      track.setAttribute('aria-valuenow',String(Math.min(count,limit)));
      fill.style.width=Math.min((count/limit)*100,100)+'%';
      fill.classList.toggle('over-limit',count>limit);
      if(remaining<0)status.textContent=numberFormat.format(Math.abs(remaining))+' characters over the selected limit.';
      else if(remaining===0)status.textContent='You are exactly at the selected limit.';
      else status.textContent=numberFormat.format(remaining)+' characters remaining.';
    }
    input.addEventListener('input',update);
    mode.addEventListener('change',update);
    clear.addEventListener('click',()=>{input.value='';input.focus();update();});
    copy.addEventListener('click',async()=>{
      if(!input.value){status.textContent='Enter some text before copying.';input.focus();return;}
      try{await navigator.clipboard.writeText(input.value);status.textContent='Text copied to clipboard.';}
      catch{input.focus();input.select();const copied=document.execCommand('copy');status.textContent=copied?'Text copied to clipboard.':'Copy failed. Select the text and copy it manually.';}
    });
    update();
  });
})();
