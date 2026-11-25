import ModularApp from 'modujs';

import { Frame } from './modules/frame.ts';
import { Listen } from './modules/listen.ts';
import { Menu } from './modules/menu.ts';
import { Scroll } from './modules/scroll.ts';
import './styles/main.css';

const app = new ModularApp({
  modules: { frame: Frame, listen: Listen, menu: Menu, scroll: Scroll },
});

app.init(app);
