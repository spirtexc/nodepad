import './styles/global.css'
import './styles/sidebar.css'
import './styles/editor.css'
import './styles/preview.css'
import './styles/statusbar.css'
import './styles/quickswitcher.css'
import './styles/plugins.css'
import { App } from './app.ts'

const root = document.getElementById('app')!
new App(root)
