import { createRoot } from 'react-dom/client'
import './index.css'
import App from './Components/App'
import { Provider } from './Context/UserContext'

createRoot(document.getElementById('root')).render(
  <Provider>
    <App />
  </Provider>
)
