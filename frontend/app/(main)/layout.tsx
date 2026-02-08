import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Sidebar />
            <div className="pl-[256px] min-h-screen transition-all duration-300" id="main-content">
                <Topbar />
                <main className="p-8 pb-32">
                    {children}
                </main>
            </div>

            {/* Script to handle sidebar padding dynamically */}
            <script dangerouslySetInnerHTML={{
                __html: `
        const observer = new MutationObserver((mutations) => {
          const sidebar = document.querySelector('aside');
          const main = document.querySelector('#main-content');
          if (sidebar && main) {
            main.style.paddingLeft = sidebar.offsetWidth + 'px';
          }
        });
        const sidebar = document.querySelector('aside');
        if (sidebar) observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
      `}} />
        </>
    );
}
