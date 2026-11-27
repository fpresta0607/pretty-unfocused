import ModularApp from 'modujs';

import { About } from './modules/about.ts';
import { Archive } from './modules/archive.ts';
import { Clips } from './modules/clips.ts';
import { Episodes } from './modules/episodes.ts';
import { Footer } from './modules/footer.ts';
import { Frame } from './modules/frame.ts';
import { Hero } from './modules/hero.ts';
import { Intro } from './modules/intro.ts';
import { Listen } from './modules/listen.ts';
import { Menu } from './modules/menu.ts';
import { Player } from './modules/player.ts';
import { Scroll } from './modules/scroll.ts';
import { Stain } from './modules/stain.ts';
import { startWhenNear } from './start-when-near.ts';
import { startWhenSettled } from './start-when-settled.ts';
import './styles/main.css';

const app = new ModularApp({
  modules: {
    frame: Frame,
    hero: Hero,
    intro: Intro,
    listen: Listen,
    menu: Menu,
    player: Player,
    scroll: Scroll,
  },
});

app.init(app);

const sectionsApp = new ModularApp({
  modules: {
    about: About,
    archive: Archive,
    clips: Clips,
    footer: Footer,
    stain: Stain,
  },
});

startWhenSettled(() => sectionsApp.init(sectionsApp));

const episodesApp = new ModularApp({ modules: { episodes: Episodes } });

startWhenNear(document.getElementById('episodes'), () => episodesApp.init(episodesApp));
