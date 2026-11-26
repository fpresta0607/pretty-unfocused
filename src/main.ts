import ModularApp from 'modujs';

import { About } from './modules/about.ts';
import { Episodes } from './modules/episodes.ts';
import { Frame } from './modules/frame.ts';
import { Hero } from './modules/hero.ts';
import { Intro } from './modules/intro.ts';
import { Listen } from './modules/listen.ts';
import { Menu } from './modules/menu.ts';
import { Player } from './modules/player.ts';
import { Scroll } from './modules/scroll.ts';
import { Stain } from './modules/stain.ts';
import './styles/main.css';

const app = new ModularApp({
  modules: {
    about: About,
    episodes: Episodes,
    frame: Frame,
    hero: Hero,
    intro: Intro,
    listen: Listen,
    menu: Menu,
    player: Player,
    scroll: Scroll,
    stain: Stain,
  },
});

app.init(app);
