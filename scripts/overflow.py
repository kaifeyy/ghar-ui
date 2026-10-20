"""Injects long names/URLs/messages, visits routes and dialogs, and reports content escaping its card or the viewport."""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from shot import page
LONG = "Muhammad Abdullah Rehman Siddiqui Chaudhry Khan Durrani Yousafzai"
URL = "https://example.com/" + "very-long-path-segment-without-breaks-" * 6
INJECT = """(()=>{const L=%s, U=%s; __ghar.useApp.setState(s=>{
 s.users.ayesha.name=L; s.users.ayesha.handle='ayesha_has_a_very_long_handle_123'; s.users.ayesha.bio=U+' '+U;
 s.users.ayesha.customStatus={text:'Studying for the provincial medical entrance test all weekend long without breaks',emoji:''};
 const k=Object.keys(s.messages)[0]; s.messages['kd-general'].push({id:'long1',author:'ayesha',text:'Look at '+U+' and also '+('Supercalifragilistic'.repeat(8)),at:Date.now(),attachments:[{kind:'file',name:('extremely_long_file_name_').repeat(5)+'.pdf',size:'2 MB'}],reactions:{},delivery:'sent'});
 s.conversations['dm-ayesha'].messages.push({id:'long2',author:'ayesha',text:U,at:Date.now(),attachments:[],reactions:{},delivery:'sent'});
 s.servers.kd.name='Karachi Developers Association of Software Engineers and Designers';
 s.channels['kd-general'].name='general-discussion-for-everyone-in-karachi-and-beyond';
 s.socialLinks.ayesha.push({platform:'website',handle:'this-is-a-really-long-personal-website-domain-name.example.com/portfolio/projects',linkedAt:Date.now(),showOnProfile:true});
})})()""" % (json.dumps(LONG), json.dumps(URL))
CHECK = """()=>{
 const cards='.dlg-in,.panel,.pcard,.sec,.note,.cs-hit,.ticket-row,.frow,.social-row,.tx,.shop-item,.dcard,.event-card,.receipt,.checkout-sum,.msg,.person,.hub,.menu,.toast,.side,.right,.chead,.hdr,.auth-card,.svc-row,.irow,.pop';
 const bad=new Set(); const vw=document.documentElement.clientWidth;
 for(const el of document.querySelectorAll('body *')){
   const r=el.getBoundingClientRect(); if(!r.width||!r.height) continue;
   if(el instanceof SVGElement) continue;
   const cs=getComputedStyle(el); if(cs.position==='fixed'||cs.visibility==='hidden') continue;
   if(cs.overflowX==='visible' && el.scrollWidth>el.clientWidth+2 && el.clientWidth>0 && el.children.length===0) bad.add('TEXT-SPILL '+el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' :: '+el.textContent.slice(0,30));
   // skip things inside horizontal scrollers (intended)
   let p=el.parentElement, scroller=false; while(p&&p!==document.body){const o=getComputedStyle(p).overflowX; if(o==='auto'||o==='scroll'){scroller=true;break} p=p.parentElement}
   if(scroller) continue;
   const card=el.parentElement&&el.parentElement.closest(cards);
   if(card){const c=card.getBoundingClientRect(); if(r.right>c.right+2||r.left<c.left-2){bad.add((card.className.split(' ')[0])+' > '+el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]); }}
   if(r.right>vw+2&&!el.closest('dialog')) bad.add('VIEWPORT > '+el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]);
 }
 return {bad:[...bad].slice(0,12), hscroll: document.documentElement.scrollWidth>vw};
}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w in [int(x) for x in (sys.argv[1:] or ['390','768','1440'])]:
            errs=[]
            ctx,pg=await page(b,w,900,errs)
            await pg.evaluate(INJECT)
            routes=['#/inbox','#/c/kd/kd-general','#/dm/dm-ayesha','#/u/ayesha','#/search','#/friends/online','#/settings/connections','#/settings/wallet','#/c/cf/settings/members','#/c/cf/settings/tickets','#/popularity','#/leaderboards','#/discover/all','#/staff/users']
            await pg.evaluate("__ghar.useApp.setState(s=>{s.staffAuthed=true; s.chatSearch.q='very'})")
            for r in routes:
                await pg.evaluate(f"location.hash='{r}'"); await pg.wait_for_timeout(250)
                res=await pg.evaluate(CHECK)
                if res['bad'] or res['hscroll']: print(w, r, res)
            for m in ["{kind:'gift',to:'ayesha'}","{kind:'memberCard',serverId:'kd',userId:'ayesha'}","{kind:'report',target:{kind:'user',userId:'ayesha'}}","{kind:'connectSocial',owner:'me',platform:'website'}","{kind:'addMoney'}"]:
                await pg.evaluate(f"__ghar.closeModal(); __ghar.openModal({m})"); await pg.wait_for_timeout(250)
                res=await pg.evaluate(CHECK)
                if res['bad']: print(w, 'modal', m[:30], res)
            await pg.evaluate("__ghar.closeModal()")
            print(w,'done errors',errs[:3])
            await ctx.close()
        await b.close()
asyncio.run(main())
