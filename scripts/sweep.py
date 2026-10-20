"""Visit every route and modal, collect page errors and console errors."""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from shot import page
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
async def main():
    w=int(sys.argv[1]) if len(sys.argv)>1 else 1440
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx,pg=await page(b,w,900,errs)
        st=await pg.evaluate("""()=>{const s=__ghar.useApp.getState();return {servers:Object.values(s.servers).map(v=>({id:v.id,ch:v.categories.flatMap(c=>c.channelIds)})),convs:Object.keys(s.conversations),users:Object.keys(s.users).slice(0,6),events:s.events.map(e=>e.id),posts:(s.forumPosts||[]).map(p=>p.id).slice(0,2),stories:s.stories.map(x=>x.id).slice(0,1)}}""")
        routes=['inbox','search','settings/connections','friends/online','friends/pending','calls','logs','communities','popularity','leaderboards','relationships','discover/all','discover/Gaming']
        routes+=['settings/'+x for x in 'account profile privacy devices appearance language voice notifications prayer wallet payouts plus shop titles moderator'.split()]
        routes+=['dm/'+c for c in st['convs']]
        routes+=['u/'+u for u in st['users']]
        for sv in st['servers']:
            routes+=[f"c/{sv['id']}/{c}" for c in sv['ch']]
        sv0=st['servers'][0]['id']
        routes+=[f'c/{sv0}/events']+[f'c/{sv0}/settings/'+x for x in 'overview roles channels members emoji invites events levels analytics bridge sponsor tickets welcome automod moderation antinuke logs audit bots integrations apps expert delete'.split()]
        for r in routes:
            n=len(errs)
            await pg.evaluate(f"location.hash='#/{r}'"); await pg.wait_for_timeout(180)
            for e in errs[n:]: print('ROUTE',r,'::',e[:300])
        await pg.evaluate("location.hash='#/inbox'"); await pg.wait_for_timeout(200)
        ch=st['servers'][0]['ch'][0]
        mods=[{'kind':k} for k in 'buyPoints addMoney plus postStory createCommunity apply allCommunities quick groupDm deleteAccount password verifyPhone payoutKyc joinInvite relationship'.split()]
        mods+=[{'kind':'connectSocial','owner':'me','platform':'tiktok'},{'kind':'connectSocial','owner':'server:cf','platform':'website'}]
        mods+=[{'kind':'gift','to':st['users'][1]},{'kind':'tip','to':st['users'][1]},{'kind':'shop','itemId':'th-midnight'},{'kind':'unlock','channelId':ch},{'kind':'donate','serverId':sv0},{'kind':'sponsor','serverId':sv0},
          {'kind':'report','target':{'kind':'user','userId':st['users'][1]}},{'kind':'report','target':{'kind':'server','serverId':sv0}},{'kind':'createChannel','serverId':sv0},{'kind':'editChannel','channelId':ch},{'kind':'createEvent','serverId':sv0},
          {'kind':'incomingCall','convId':st['convs'][0]},{'kind':'ipWarning','then':'video'},{'kind':'externalLink','href':'https://example.com'},{'kind':'profileMedia','which':'avatar'},{'kind':'profileMedia','which':'banner'},
          {'kind':'moderate','serverId':sv0,'userId':st['users'][1],'action':'timeout'},{'kind':'emojiUpload','serverId':sv0,'type':'emoji'},{'kind':'bridgeRequest','serverId':sv0},{'kind':'expertRequest','serverId':sv0},{'kind':'memberCard','serverId':sv0,'userId':st['users'][1]}]
        if st['events']: mods.append({'kind':'event','eventId':st['events'][0]})
        if st['stories']: mods+=[{'kind':'storyAudience','storyId':st['stories'][0]},{'kind':'highlight','storyId':st['stories'][0]}]
        for m in mods:
            n=len(errs)
            await pg.evaluate("m=>{__ghar.closeModal();__ghar.openModal(m)}", m); await pg.wait_for_timeout(200)
            vis=await pg.evaluate("()=>!!document.querySelector('dialog[open]')")
            if not vis: print('MODAL NOT OPEN',m['kind'])
            for e in errs[n:]: print('MODAL',m['kind'],'::',e[:300])
            await pg.keyboard.press('Escape')
        # staff
        await pg.evaluate("__ghar.closeModal()")
        await pg.evaluate("__ghar.useApp.setState(s=>{s.staffAuthed=true})")
        for x in 'dashboard users integrations applications reports bans badges certification reserved expert decoys audit'.split():
            n=len(errs); await pg.evaluate(f"location.hash='#/staff/{x}'"); await pg.wait_for_timeout(150)
            for e in errs[n:]: print('STAFF',x,'::',e[:300])
        print('TOTAL ERRORS',len(errs), 'routes',len(routes),'modals',len(mods))
        await b.close()
asyncio.run(main())
