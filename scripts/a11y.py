"""Keyboard and structure checks."""
import asyncio, sys, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from shot import page
async def main():
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w in [390,768,1024,1440,1920]:
            ctx,pg=await page(b,w,900,errs)
            r=await pg.evaluate("""()=>{const q=s=>document.querySelectorAll(s);const bar=q('[data-component=up400]')[0];const acct=q('[data-component=up399]');
              const br=bar&&bar.getBoundingClientRect(), ar=acct[0]&&acct[0].getBoundingClientRect();
              return {up399:acct.length, up400:q('[data-component=up400]').length, barTop:br&&br.top, barH:br&&Math.round(br.height), acctRight:ar&&Math.round(window.innerWidth-ar.right), acctInBar: !!(bar&&acct[0]&&bar.contains(acct[0])), hscroll: document.documentElement.scrollWidth>window.innerWidth}}""")
            print(w, r)
            await ctx.close()
        ctx,pg=await page(b,1440,900,errs)
        await pg.focus('.acct-trigger'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        print('hub open:', await pg.evaluate("document.querySelector('.acct-trigger').getAttribute('aria-expanded')"), 'focus in hub:', await pg.evaluate("!!document.activeElement.closest('#account-hub')"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        print('after esc expanded:', await pg.evaluate("document.querySelector('.acct-trigger').getAttribute('aria-expanded')"), 'focus back:', await pg.evaluate("document.activeElement.classList.contains('acct-trigger')"))
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(200)
        await pg.mouse.click(700,500); await pg.wait_for_timeout(200)
        print('outside click closes:', await pg.evaluate("document.querySelector('.acct-trigger').getAttribute('aria-expanded')"))
        # deafen restores mic
        m=await pg.evaluate("""async()=>{const g=()=>{const s=__ghar.useApp.getState();return [s.audio?.muted??s.muted, s.audio?.deafened??s.deafened]};const btn=l=>[...document.querySelectorAll('[data-component=up400] button[aria-pressed]')];return btn().map(b=>b.getAttribute('aria-label')+'='+b.getAttribute('aria-pressed'))}""")
        print('audio buttons:', m)
        bs=pg.locator('[data-component=up400] button[aria-pressed]')
        await bs.nth(1).click(); await pg.wait_for_timeout(100)
        print('after deafen:', await pg.evaluate("[...document.querySelectorAll('[data-component=up400] button[aria-pressed]')].map(b=>b.getAttribute('aria-pressed'))"))
        await bs.nth(1).click(); await pg.wait_for_timeout(100)
        print('after undeafen:', await pg.evaluate("[...document.querySelectorAll('[data-component=up400] button[aria-pressed]')].map(b=>b.getAttribute('aria-pressed'))"))
        # invisible presence does not show net banner
        await pg.evaluate("__ghar.useApp.setState(s=>{s.presence='invisible'})"); await pg.wait_for_timeout(200)
        print('banner with invisible:', await pg.evaluate("!!document.querySelector('.netbanner, [data-component=netbanner]')"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
