import asyncio, sys, os, json
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS=open('/tmp/claude-0/-home-claude/5ec4e3df-6130-5c59-83ea-d74cd496e045/scratchpad/fonts/fonts.css').read()
async def page(b, w=1440, h=900, errs=None, scheme='dark', zoom=1):
    ctx=await b.new_context(viewport={'width':w,'height':h}, color_scheme=scheme, device_scale_factor=zoom)
    pg=await ctx.new_page()
    async def fr(route):
        if 'fonts.googleapis' in route.request.url: await route.fulfill(body=FONTS, content_type='text/css')
        else: await route.abort()
    await pg.route("**/*fonts.g*/**", fr)
    if errs is not None:
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE '+m.type+' '+m.text) if m.type in ('error','warning') else None)
    await pg.goto('file://'+ROOT+'/dist-single/index.html#demo'); await pg.wait_for_timeout(500)
    return ctx, pg
async def main():
    # usage: shot.py name width [js...]
    name=sys.argv[1]; w=int(sys.argv[2]); js=sys.argv[3:] 
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx,pg=await page(b,w,{390:844,768:1024,1024:768,1440:900,1920:1080}.get(w,900),errs)
        for j in js:
            if j.startswith('click:'): await pg.click(j[6:])
            elif j.startswith('wait:'): await pg.wait_for_timeout(int(j[5:]))
            elif j.startswith('key:'): await pg.keyboard.press(j[4:])
            else: await pg.evaluate(j)
            await pg.wait_for_timeout(250)
        os.makedirs(ROOT+'/shots',exist_ok=True)
        await pg.screenshot(path=f'{ROOT}/shots/{name}.png')
        print('\n'.join(errs[:20]))
        await b.close()
if __name__ == "__main__": asyncio.run(main())
