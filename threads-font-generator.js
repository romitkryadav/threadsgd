(() => {
  'use strict';
  const smallCaps = Array.from('ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ');
  const doubleUpper = Array.from('𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ');
  const scriptUpper = Array.from('𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵');
  const scriptLower = Array.from('𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏');
  const flipped = { a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'ן',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',A:'∀',B:'𐐒',C:'Ɔ',D:'◖',E:'Ǝ',F:'Ⅎ',G:'פ',H:'H',I:'I',J:'ſ',K:'⋊',L:'˥',M:'W',N:'N',O:'O',P:'Ԁ',Q:'Ό',R:'ᴚ',S:'S',T:'⊥',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z','0':'0','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6','.':'˙',',':'\'',"'":',','"':'„','!':'¡','?':'¿','(':")",')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<','_':'‾','&':'⅋'};
  function rangeStyle(upperStart, lowerStart, digitStart, exceptions) {
    return text => Array.from(text, char => {
      const code = char.codePointAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + code - 65);
      if (code >= 97 && code <= 122) return exceptions && exceptions[char] || String.fromCodePoint(lowerStart + code - 97);
      if (digitStart && code >= 48 && code <= 57) return String.fromCodePoint(digitStart + code - 48);
      return char;
    }).join('');
  }
  function alphabetStyle(upper, lower) {
    return text => Array.from(text, char => {
      const code = char.codePointAt(0);
      if (code >= 65 && code <= 90) return upper[code - 65];
      if (code >= 97 && code <= 122) return lower[code - 97];
      return char;
    }).join('');
  }
  function decorated(prefix, suffix) { return text => prefix + text + suffix; }
  const superscript = {a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'};
  const subscript = {a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ','0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎'};
  const styles = [
    {name:'Bold',category:'Bold',convert:rangeStyle(0x1D400,0x1D41A,0x1D7CE)},
    {name:'Sans bold',category:'Bold',convert:rangeStyle(0x1D5D4,0x1D5EE,0x1D7EC)},
    {name:'Bold italic',category:'Bold',convert:rangeStyle(0x1D468,0x1D482)},
    {name:'Sans bold italic',category:'Bold',convert:rangeStyle(0x1D63C,0x1D656)},
    {name:'Italic',category:'Italic',convert:rangeStyle(0x1D434,0x1D44E,0,{h:'ℎ'})},
    {name:'Sans italic',category:'Italic',convert:rangeStyle(0x1D608,0x1D622)},
    {name:'Script',category:'Cursive',convert:alphabetStyle(scriptUpper,scriptLower)},
    {name:'Bold script',category:'Cursive',convert:rangeStyle(0x1D4D0,0x1D4EA)},
    {name:'Fraktur',category:'Gothic',convert:rangeStyle(0x1D504,0x1D51E,0,{C:'ℭ',H:'ℌ',I:'ℑ',R:'ℜ'})},
    {name:'Bold fraktur',category:'Gothic',convert:rangeStyle(0x1D56C,0x1D586)},
    {name:'Double-struck',category:'Outline',convert:text=>Array.from(text,char=>{const c=char.codePointAt(0);if(c>=65&&c<=90)return doubleUpper[c-65];if(c>=97&&c<=122)return String.fromCodePoint(0x1D552+c-97);if(c>=48&&c<=57)return String.fromCodePoint(0x1D7D8+c-48);return char;}).join('')},
    {name:'Circled',category:'Outline',convert:text=>Array.from(text,char=>{const c=char.codePointAt(0);if(c>=65&&c<=90)return String.fromCodePoint(0x24B6+c-65);if(c>=97&&c<=122)return String.fromCodePoint(0x24D0+c-97);if(char==='0')return '⓪';if(c>=49&&c<=57)return String.fromCodePoint(0x2460+c-49);return char;}).join('')},
    {name:'Small caps',category:'Small',convert:text=>Array.from(text,char=>{const c=char.codePointAt(0);return c>=97&&c<=122?smallCaps[c-97]:char;}).join('')},
    {name:'Superscript',category:'Small',convert:text=>Array.from(text,char=>superscript[char]||char).join('')},
    {name:'Subscript',category:'Small',convert:text=>Array.from(text,char=>subscript[char]||char).join('')},
    {name:'Strikethrough',category:'Strikethrough',convert:text=>Array.from(text,char=>/\s/.test(char)?char:char+'\u0336').join('')},
    {name:'Underline',category:'Underline',convert:text=>Array.from(text,char=>/\s/.test(char)?char:char+'\u0332').join('')},
    {name:'Star style',category:'Symbols',convert:decorated('✦  ','  ✦')},
    {name:'Heart style',category:'Symbols',convert:decorated('♡  ','  ♡')},
    {name:'Arrow style',category:'Symbols',convert:decorated('➤  ','  ◂')},
    {name:'Floral frame',category:'Decorated',convert:decorated('꧁༺ ',' ༻꧂')},
    {name:'Quote frame',category:'Decorated',convert:decorated('『','』')},
    {name:'Bow frame',category:'Decorated',convert:decorated('୨୧ ',' ୨୧')},
    {name:'Sparkle frame',category:'Decorated',convert:decorated('｡･:*:･ﾟ★,｡･:*:･ﾟ☆ ',' ☆ﾟ･:*:･｡,★ﾟ･:*:･｡')},
    {name:'Wide spacing',category:'Spacing',convert:text=>text.split(/(\s+)/).map(part=>/^\s+$/.test(part)?part:Array.from(part).join(' ')).join('')},
    {name:'Dotted spacing',category:'Spacing',convert:text=>text.split(/(\s+)/).map(part=>/^\s+$/.test(part)?part:Array.from(part).join(' · ')).join('')},
    {name:'Upside down',category:'Flipped',convert:text=>Array.from(text).reverse().map(char=>flipped[char]||char).join('')},
    {name:'Monospace',category:'Monospace',convert:rangeStyle(0x1D670,0x1D68A,0x1D7F6)}
  ];
  document.addEventListener('DOMContentLoaded', () => {
    const input=document.getElementById('fontText');
    const results=document.getElementById('fontResults');
    const count=document.getElementById('charCount');
    const clear=document.getElementById('clearText');
    const status=document.getElementById('copyStatus');
    const categoryBox=document.getElementById('fontCategories');
    if(!input||!results||!count||!clear||!status||!categoryBox)return;
    let selectedCategory='All';
    const cards=styles.map((style,index)=>{
      const card=document.createElement('article');card.className='font-result';card.dataset.category=style.category;
      const header=document.createElement('div');header.className='font-result-head';
      const title=document.createElement('h3');title.textContent=style.name;
      const button=document.createElement('button');button.type='button';button.className='font-copy';button.textContent='Copy';button.disabled=true;button.setAttribute('aria-label','Copy '+style.name+' text');
      const preview=document.createElement('div');preview.className='font-preview';preview.id='fontPreview'+index;preview.textContent='Your styled text will appear here.';preview.setAttribute('aria-label',style.name+' preview');
      button.addEventListener('click',async()=>{
        const text=style.convert(input.value);if(!text)return;
        try{await navigator.clipboard.writeText(text);status.textContent=style.name+' text copied.';}
        catch{const helper=document.createElement('textarea');helper.value=text;helper.setAttribute('readonly','');helper.style.position='fixed';helper.style.opacity='0';document.body.appendChild(helper);helper.select();const copied=document.execCommand('copy');helper.remove();status.textContent=copied?style.name+' text copied.':'Copy failed. Select the preview text and copy it manually.';}
      });
      header.append(title,button);card.append(header,preview);results.appendChild(card);
      return{style,card,preview,button};
    });
    function update(){
      count.textContent=String(Array.from(input.value).length);status.textContent='';
      cards.forEach(({style,card,preview,button})=>{preview.textContent=input.value?style.convert(input.value):'Your styled text will appear here.';button.disabled=!input.value;card.hidden=selectedCategory!=='All'&&style.category!==selectedCategory;});
    }
    categoryBox.addEventListener('click',event=>{
      const button=event.target.closest('[data-category]');if(!button)return;
      selectedCategory=button.dataset.category;
      categoryBox.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      update();
    });
    input.addEventListener('input',update);
    clear.addEventListener('click',()=>{input.value='';input.focus();update();});
    update();
  });
})();

