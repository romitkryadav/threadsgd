(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const ids=['followerCount','postViews','likeCount','replyCount','repostCount','quoteCount'];
    const fields=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
    const totalOutput=document.getElementById('totalInteractions');
    const followerOutput=document.getElementById('followerRate');
    const viewOutput=document.getElementById('viewRate');
    const followerHelp=document.getElementById('followerRateHelp');
    const viewHelp=document.getElementById('viewRateHelp');
    const status=document.getElementById('calculatorStatus');
    const copyButton=document.getElementById('copySummary');
    const resetButton=document.getElementById('resetCalculator');
    if(ids.some(id=>!fields[id])||!totalOutput||!followerOutput||!viewOutput||!followerHelp||!viewHelp||!status||!copyButton||!resetButton)return;
    const formatter=new Intl.NumberFormat(undefined,{maximumFractionDigits:0});
    const readCount=field=>{const value=field.value.trim()===''?0:Number(field.value);return Number.isFinite(value)&&value>=0?Math.floor(value):0;};
    let summary='';
    function calculate(){
      const likes=readCount(fields.likeCount),replies=readCount(fields.replyCount),reposts=readCount(fields.repostCount),quotes=readCount(fields.quoteCount);
      const interactions=likes+replies+reposts+quotes;
      const followers=readCount(fields.followerCount),views=readCount(fields.postViews);
      totalOutput.textContent=formatter.format(interactions);
      if(followers>0){followerOutput.textContent=((interactions/followers)*100).toFixed(2)+'%';followerHelp.textContent=formatter.format(interactions)+' interactions ÷ '+formatter.format(followers)+' followers.';}
      else{followerOutput.textContent='—';followerHelp.textContent='Add the account\'s follower count.';}
      if(views>0){viewOutput.textContent=((interactions/views)*100).toFixed(2)+'%';viewHelp.textContent=formatter.format(interactions)+' interactions ÷ '+formatter.format(views)+' views.';}
      else{viewOutput.textContent='—';viewHelp.textContent='Optional: add post views or impressions.';}
      const lines=['Threads engagement calculation','Total interactions: '+formatter.format(interactions)];
      lines.push(followers>0?'Engagement by followers: '+((interactions/followers)*100).toFixed(2)+'%':'Engagement by followers: not calculated (follower count missing)');
      lines.push(views>0?'Engagement by views: '+((interactions/views)*100).toFixed(2)+'%':'Engagement by views: not calculated (view count missing)');
      summary=lines.join('\n');
    }
    ids.forEach(id=>fields[id].addEventListener('input',()=>{status.textContent='';calculate();}));
    copyButton.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(summary);status.textContent='Calculation copied.';}
      catch{const helper=document.createElement('textarea');helper.value=summary;helper.setAttribute('readonly','');helper.style.position='fixed';helper.style.opacity='0';document.body.appendChild(helper);helper.select();const copied=document.execCommand('copy');helper.remove();status.textContent=copied?'Calculation copied.':'Copy failed. You can select the results and copy them manually.';}
    });
    resetButton.addEventListener('click',()=>{ids.forEach(id=>{fields[id].value=id==='likeCount'||id==='replyCount'||id==='repostCount'||id==='quoteCount'?'0':'';});status.textContent='Calculator reset.';calculate();});
    calculate();
  });
})();
