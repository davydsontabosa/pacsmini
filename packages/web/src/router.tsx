import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import Dashboard    from './pages/Dashboard'
import Patients     from './pages/Patients'
import Studies      from './pages/Studies'
import Worklist     from './pages/Worklist'
import Upload       from './pages/Upload'
import Settings     from './pages/Settings'
import Shares       from './pages/Shares'
import Events       from './pages/Events'
import Portal       from './pages/Portal'
import Destinations from './pages/Destinations'
import Doctors       from './pages/Doctors'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,            element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',      element: <Dashboard />     },
      { path: 'patients',       element: <Patients />      },
      { path: 'studies',        element: <Studies />       },
      { path: 'worklist',       element: <Worklist />      },
      { path: 'doctors',        element: <Doctors />       },
      { path: 'destinations',   element: <Destinations />  },
      { path: 'upload',         element: <Upload />        },
      { path: 'settings',       element: <Settings />      },
      { path: 'shares',         element: <Shares />        },
      { path: 'events',         element: <Events />        },
    ],
  },
  { path: '/portal/:tokenId', element: <Portal /> },
])
