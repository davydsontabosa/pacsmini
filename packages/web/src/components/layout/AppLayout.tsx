import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileSearch, ClipboardList,
  Upload, Settings, Share2, AlertCircle, Activity, Send, Stethoscope
} from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { useDoctorStore } from '../../store/doctorStore'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/studies',      label: 'Estudos',         icon: FileSearch      },
  { to: '/patients',     label: 'Pacientes',       icon: Users           },
  { to: '/worklist',     label: 'Worklist',        icon: ClipboardList   },
  { to: '/doctors',      label: 'Médicos',         icon: Stethoscope     },
  { to: '/destinations', label: 'Destinos DICOM',  icon: Send            },
  { to: '/upload',       label: 'Upload',          icon: Upload          },
  { to: '/shares',       label: 'Compartilhar',    icon: Share2          },
  { to: '/events',       label: 'Eventos DICOM',   icon: AlertCircle     },
  { to: '/settings',     label: 'Configurações',   icon: Settings        },
]

export function AppLayout() {
  const { isConnected, host, port } = useConnectionStore()
  const { activeDoctor, clearDoctor } = useDoctorStore()
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-s1 border-r border-bd flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2.5">
            <Activity size={20} className="text-ac" />
            <span className="font-display font-bold text-tx text-base">PACS Mini</span>
            <span className="ml-auto text-[10px] font-mono text-mt bg-s2 px-1.5 py-0.5 rounded">v2</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-ok' : 'bg-er')} />
            <span className="text-[11px] text-mt font-mono truncate">
              {isConnected ? (host ? `${host}:${port}` : 'Conectado') : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-ac/10 text-ac font-medium'
                  : 'text-mt hover:text-tx hover:bg-s2'
              )}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Active doctor indicator */}
        {activeDoctor && (
          <div className="mx-2 mb-2 bg-ac/10 border border-ac/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-ac font-semibold truncate">👁 {activeDoctor.name}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-mt">Visão médico ativa</p>
              <button onClick={clearDoctor}
                className="text-[9px] text-er hover:underline">Sair</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-bd text-[10px] text-mt">
          PACS Mini v2.0 · dcm4chee Arc 5
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
