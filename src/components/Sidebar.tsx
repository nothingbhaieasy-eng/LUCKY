import { Menu, X } from 'lucide-react';
import { type SVGProps, useState } from 'react';
import type { AppSection } from '../types/sfs';

interface SidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  pendingCount: number;
  receiptCount: number;
}

type NavIconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="3.5" width="7.5" height="9.5" rx="1.75" />
      <rect x="13" y="3.5" width="7.5" height="5.5" rx="1.75" />
      <rect x="13" y="11" width="7.5" height="9.5" rx="1.75" />
      <rect x="3.5" y="15" width="7.5" height="5.5" rx="1.75" />
    </svg>
  );
}

function TeachersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="9.5" cy="7.5" r="3.25" />
      <path d="M3.5 19.25c0-3.1 2.7-5.25 6-5.25s6 2.15 6 5.25" />
      <circle cx="17.25" cy="9" r="2.25" />
      <path d="M16.75 14.5c2.2.35 3.75 1.85 3.75 4.25" />
    </svg>
  );
}

function TimetableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.25" />
      <path d="M3.5 9.5h17" />
      <path d="M8 2.75v3.25" />
      <path d="M16 2.75v3.25" />
      <path d="M9.5 9.5v11" />
      <path d="M15 9.5v11" />
      <path d="M3.5 15h17" />
    </svg>
  );
}

function SubstitutionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 8.25h12.5" />
      <path d="m14.25 4.75 3.5 3.5-3.5 3.5" />
      <path d="M19 15.75H6.5" />
      <path d="m9.75 12.25-3.5 3.5 3.5 3.5" />
    </svg>
  );
}

function ReceiptsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 3.5h12a1.75 1.75 0 0 1 1.75 1.75v15.25l-2.6-1.6-2.55 1.6-2.6-1.6-2.6 1.6-2.55-1.6-2.6 1.6V5.25A1.75 1.75 0 0 1 6 3.5Z" />
      <path d="M9 8.75h6" />
      <path d="M9 12.5h6" />
      <path d="M9 16.25h3.5" />
    </svg>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4.5 7h9.5" />
      <path d="M18.5 7h1" />
      <circle cx="16.25" cy="7" r="2.25" />
      <path d="M4.5 12h2" />
      <path d="M11 12h8.5" />
      <circle cx="8.75" cy="12" r="2.25" />
      <path d="M4.5 17h7.5" />
      <path d="M16.5 17h3" />
      <circle cx="14.25" cy="17" r="2.25" />
    </svg>
  );
}

const PRIMARY_NAV: Array<{
  id: AppSection;
  label: string;
  icon: NavIconComponent;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'teachers', label: 'Teachers', icon: TeachersIcon },
  { id: 'timetable', label: 'Timetable', icon: TimetableIcon },
  { id: 'substitutions', label: 'Substitutions', icon: SubstitutionsIcon },
  { id: 'receipts', label: 'Receipts', icon: ReceiptsIcon },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  pendingCount,
  receiptCount,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: AppSection) => {
    onSelectSection(id);
    setMobileOpen(false);
  };

  const navContent = (
    <div
      className="flex flex-col h-full text-[#F7F6F0]"
      style={{
        background:
          'linear-gradient(180deg, rgba(8, 30, 22, 0.98) 0%, rgba(11, 38, 28, 0.96) 52%, rgba(6, 21, 16, 0.98) 100%)',
      }}
    >
      {/* Brand Header */}
      <div
        className="px-5 py-5 border-b border-[#C7A45A]/25 flex items-center justify-between gap-2"
        style={{
          background:
            'radial-gradient(120% 100% at 15% 0%, rgba(199, 164, 90, 0.14) 0%, rgba(8, 30, 22, 0) 72%)',
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#092018] border border-[#C7A45A]/75 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(4,15,11,0.4)]">
              <span
                className="text-sm font-bold text-[#EAD8A6] tracking-wider"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                SFS
              </span>
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold text-white tracking-wide truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Shemford Futuristic
              </p>
              <p className="text-xs text-[#F3E7C6] truncate mt-0.5">
                Substitution Desk
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-[#F3E7C6] hover:text-white hover:bg-[#12372B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5D4A5] cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav
        className="flex-1 px-4 py-6 overflow-y-auto"
        aria-label="Primary navigation"
      >
        <p className="px-3 mb-3 text-[11px] font-semibold tracking-wider text-[#E5D4A5]/75">
          Workspace
        </p>

        <div className="space-y-3">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const count =
              item.id === 'substitutions' && pendingCount > 0
                ? pendingCount
                : item.id === 'receipts' && receiptCount > 0
                ? receiptCount
                : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group w-full min-h-[48px] flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#EAD8A6] to-[#C7A45A] text-[#071A13] font-bold border border-[#F5E7BC] shadow-[0_8px_20px_rgba(3,12,9,0.42),inset_0_1px_0_rgba(255,255,255,0.55)]'
                    : 'text-[#EEF3EF] font-medium hover:text-white hover:bg-[#133A2C]/90 border border-transparent hover:border-[#C7A45A]/30'
                }`}
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#071A13]/12 text-[#071A13]'
                        : 'bg-[#0C2B20]/90 text-[#EAD8A6] border border-[#C7A45A]/20 group-hover:bg-[#174A38] group-hover:border-[#C7A45A]/45'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="truncate tracking-[0.01em]">
                    {item.label}
                  </span>
                </span>

                {count !== null && (
                  <span
                    className={`text-xs font-mono font-bold tabular-nums px-1 ${
                      isActive ? 'text-[#071A13]' : 'text-[#EAD8A6]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Secondary Settings */}
      <div className="px-4 py-5 border-t border-[#C7A45A]/20 bg-[#05140E]/45">
        <button
          type="button"
          onClick={() => handleNav('settings')}
          aria-current={activeSection === 'settings' ? 'page' : undefined}
          className={`group w-full min-h-[48px] flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] cursor-pointer ${
            activeSection === 'settings'
              ? 'bg-gradient-to-r from-[#EAD8A6] to-[#C7A45A] text-[#071A13] font-bold border border-[#F5E7BC] shadow-[0_8px_20px_rgba(3,12,9,0.42),inset_0_1px_0_rgba(255,255,255,0.55)]'
              : 'text-[#DCE5DF] font-medium hover:text-white hover:bg-[#133A2C]/90 border border-transparent hover:border-[#C7A45A]/30'
          }`}
        >
          <span
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeSection === 'settings'
                ? 'bg-[#071A13]/12 text-[#071A13]'
                : 'bg-[#0C2B20]/90 text-[#C7A45A] border border-[#C7A45A]/20 group-hover:bg-[#174A38] group-hover:text-[#EAD8A6]'
            }`}
          >
            <SettingsIcon className="w-[18px] h-[18px]" />
          </span>
          <span className="truncate">Settings &amp; Data</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar (compact <= 56px height) */}
      <div className="lg:hidden sticky top-0 z-30 bg-gradient-to-r from-[#081E16] to-[#0C291F] text-white px-4 py-2 flex items-center justify-between border-b border-[#C7A45A]/35 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#092018] border border-[#C7A45A]/75 flex items-center justify-center shrink-0">
            <span
              className="text-xs font-bold text-[#EAD8A6]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              SFS
            </span>
          </div>
          <span
            className="text-sm font-semibold tracking-wide text-white truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Shemford Futuristic School
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg bg-[#12372B] border border-[#C7A45A]/45 text-[#EAD8A6] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5D4A5] cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Fixed Rail */}
      <aside className="hidden lg:block w-68 shrink-0 border-r border-[#C7A45A]/30 shadow-[4px_0_24px_rgba(4,15,11,0.45)] sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#040F0B]/75"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] h-full z-10 shadow-2xl border-r border-[#C7A45A]/35">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
