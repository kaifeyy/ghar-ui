"""Batch screenshots: gallery.py width [theme] [lang] [extra-css-zoom]"""
import asyncio, sys, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from shot import page
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS=[
 ('inbox','#/inbox',None),('channel','#/c/kd/kd-general',None),('profile','#/u/me',None),('profile-other','#/u/ayesha',None),
 ('settings-profile','#/settings/profile',None),('settings-appearance','#/settings/appearance',None),('settings-wallet','#/settings/wallet',None),('settings-shop','#/settings/shop',None),
 ('ss-roles','#/c/cf/settings/roles',None),('ss-channels','#/c/cf/settings/channels',None),('ss-tickets','#/c/cf/settings/tickets',None),('ss-members','#/c/cf/settings/members',None),('ss-analytics','#/c/cf/settings/analytics',None),
 ('discover','#/discover/all',None),('events','#/c/tc/events',None),('popularity','#/popularity',None),('leaderboards','#/leaderboards',None),
 ('staff','#/staff/badges','staff'),('hub','#/inbox','hub'),('story','#/inbox','story'),('gift','#/u/ayesha','gift'),
]
async def main():
    w=int(sys.argv[1]); theme=sys.argv[2] if len(sys.argv)>2 else 'dark'; lang=sys.argv[3] if len(sys.argv)>3 else 'en'; zoom=float(sys.argv[4]) if len(sys.argv)>4 else 1
    only=os.environ.get('ONLY','').split(',') if os.environ.get('ONLY') else None
    errs=[]
    h={390:844,768:1024,1024:768,1440:900,1920:1080}.get(w,900)
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx,pg=await page(b,int(w/zoom),int(h/zoom),errs,zoom=zoom)
        await pg.evaluate(f"__ghar.useApp.setState(s=>{{s.prefs.theme='{theme}';s.prefs.lang='{lang}'}})")
        tag=f"{w}-{theme}-{lang}"+(f"-z{int(zoom*100)}" if zoom!=1 else '')
        os.makedirs(ROOT+'/shots/'+tag,exist_ok=True)
        for name,hsh,act in SHOTS:
            if only and name not in only: continue
            await pg.evaluate("__ghar.closeModal(); __ghar.useApp.setState(s=>{s.accountOpen=false; s.storyView=null})")
            await pg.evaluate(f"location.hash='{hsh}'"); await pg.wait_for_timeout(250)
            if act=='staff': await pg.evaluate("__ghar.useApp.setState(s=>{s.staffAuthed=true})")
            if act=='hub': await pg.click('[data-component=up399] button >> nth=0')
            if act=='story': await pg.locator('.stories button').nth(2).click()
            if act=='gift': await pg.evaluate("__ghar.openModal({kind:'gift',to:'ayesha'})")
            await pg.wait_for_timeout(350)
            await pg.screenshot(path=f'{ROOT}/shots/{tag}/{name}.png')
            await pg.keyboard.press('Escape')
        print(tag,'errors:',errs[:5])
        await b.close()
asyncio.run(main())
