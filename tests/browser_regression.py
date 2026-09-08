"""Run with Python + playwright (and `playwright install chromium`). No HA login needed."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "custom_components/ha_theme_tweaker/frontend"
HTML = """<home-assistant></home-assistant><script>
const root=document.querySelector('home-assistant').attachShadow({mode:'open'});
root.innerHTML='<home-assistant-main></home-assistant-main>';
const main=root.firstElementChild.attachShadow({mode:'open'});
window.mount=()=>{
 const host=document.createElement('hui-root');const r=host.attachShadow({mode:'open'});
 r.innerHTML='<hui-view></hui-view>';const view=r.firstElementChild.attachShadow({mode:'open'});
 for(let i=0;i<300;i++){const c=document.createElement('audit-card');c.attachShadow({mode:'open'}).innerHTML='<span>state</span>';view.append(c)}
 main.replaceChildren(host);window.dashboard=r;window.cards=view;
};mount();
</script>"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.add_init_script("""window.activeObservers=0;const MO=MutationObserver;
      window.MutationObserver=class extends MO {
        observe(...a){if(!this.active){activeObservers++;this.active=true}return super.observe(...a)}
        disconnect(){if(this.active){activeObservers--;this.active=false}return super.disconnect()}
      };"""
    )
    def serve(route):
        path = route.request.url.split("ha-audit.test/")[1]
        route.fulfill(content_type="text/javascript" if path.endswith(".js") else "text/html",
                      body=(ROOT / path).read_text() if path.endswith(".js") else HTML)
    page.route("http://ha-audit.test/**", serve)
    page.goto("http://ha-audit.test/")
    page.evaluate("async()=>{window.api=await import('/shadow-dom.js');window.stop=api.startThemeTweakerWatcher();api.applyThemeTweakerStyles({primary_color:'#ff0000',header_background:'#112233'})}")
    page.wait_for_timeout(700)
    baseline = page.evaluate("activeObservers")
    assert baseline < 10
    assert page.evaluate("stop===api.startThemeTweakerWatcher()")
    for _ in range(8):
        page.evaluate("mount(); dispatchEvent(new Event('location-changed'))")
        page.wait_for_timeout(100)
    page.wait_for_timeout(700)
    assert page.evaluate("activeObservers") == baseline
    assert page.evaluate("dashboard.querySelectorAll('#ha-theme-tweaker-header-style').length") == 1
    assert page.evaluate("[...cards.children].every(c=>!c.shadowRoot.querySelector('style'))")
    page.evaluate("stop()")
    assert page.evaluate("activeObservers") == 0
    browser.close()
print("PASS: targeted roots, idempotent watcher, no duplicate styles, teardown")
