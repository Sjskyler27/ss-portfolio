<template>
  <main id="app">
    <header class="site-header">
      <button class="brand" @click="setView('about')">
        <span>Skyler Simpson</span>
        <small>Full-stack developer</small>
      </button>
      <nav aria-label="Portfolio sections">
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="getNavButtonClass(item.id)"
          @click="setView(item.id)"
        >
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <a href="Resume6-1.pdf" target="_blank" class="resume-link"> Resume </a>
    </header>

    <div class="page-stage">
      <Transition :name="pageTransitionName" appear>
    <section v-if="currentView === 'about'" key="about" class="page about-page">
  <div class="about-copy">
    <h2>
      Full-stack developer focused on product workflows, AI-assisted development,
      and building software people actually use.
    </h2>

    <p>
      I work across frontend systems, backend services, mobile apps, and deployment
      tooling with experience in Vue, Flutter, React, Node, and modern AI-assisted
      engineering workflows.
    </p>

    <p>
      A lot of my work centers around improving messy operational processes —
      onboarding, credentialing, admin tooling, automations, and internal workflows —
      by turning them into maintainable products with clean user experiences.
    </p>

    <p>
      I enjoy learning new stacks quickly, building practical systems end-to-end,
      and combining product thinking with implementation.
    </p>

    <div class="about-actions">
      <button @click="setView('projects')">See Projects</button>
      <button @click="setView('experience')">View Experience</button>
    </div>
  </div>

  <img src="./assets/photos/skylersimpson.png" alt="Skyler Simpson" fetchpriority="high" />
</section>

    <section v-else-if="currentView === 'experience'" key="experience" class="page experience-page">
      <div class="page-heading">
        <h1 class="eyebrow">Experience</h1>
      </div>

      <div class="experience-grid">
        <article v-for="item in experienceItems" :key="item.organization">
          <span>{{ item.organization }}</span>
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
          <div class="tag-list">
            <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="currentView === 'projects'" key="projects" class="page projects-page">
      <div class="page-heading compact-heading">
        <h1 class="eyebrow">Projects</h1>
      </div>

      <div class="project-grid">
        <button
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          @click="openProject(project)"
        >
          <img
            :src="resolvePreloadControlledImage(project.images[0], project)"
            :alt="project.title"
            fetchpriority="low"
            loading="lazy"
          />
          <div class="project-card-body">
            <span class="project-type">{{ project.type }}</span>
            <h2>{{ project.title }}</h2>
            <p>{{ project.summary }}</p>
            <div class="tag-list">
              <span v-for="tech in project.tech" :key="tech">{{ tech }}</span>
            </div>
          </div>
        </button>
      </div>
    </section>
      </Transition>
    </div>

    <Transition name="modal-slide" appear>
    <div
      class="project-modal-backdrop"
      v-if="projectModalOpen"
      @click.self="closeProjectModal"
    >
      <article class="project-modal">
        <button
          class="modal-close"
          @click="closeProjectModal"
          aria-label="Close project details"
        >
          &times;
        </button>
        <div class="project-modal-copy">
          <p class="eyebrow">{{ selectedProject.type }}</p>
          <h2>{{ selectedProject.title }}</h2>
          <p class="impact">{{ selectedProject.impact }}</p>
          <p>{{ selectedProject.description }}</p>
          <div class="tag-list modal-tags">
            <span v-for="tech in selectedProject.tech" :key="tech">{{ tech }}</span>
          </div>
          <div class="detail-links" v-if="selectedProject.links.length">
            <a
              v-for="link in selectedProject.links"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noreferrer"
              @click="notifyExternalLink(link)"
            >
              {{ link.name }}
            </a>
          </div>
        </div>

        <div class="project-modal-media">
          <div class="carousel">
            <button @click="previousImage" aria-label="Previous image">&#8249;</button>
            <div class="carousel-image-wrap" @click="imageModalOpen = true">
              <img
                :src="resolveImage(selectedProject.images[selectedImageIndex])"
                :alt="selectedProject.title"
                fetchpriority="high"
              />
              <span aria-hidden="true" class="magnify-icon">&#128269;</span>
            </div>
            <button @click="nextImage" aria-label="Next image">&#8250;</button>
          </div>
          <div class="thumbnail-row">
            <button
              v-for="(image, index) in selectedProject.images"
              :key="image"
              :class="{ active: selectedImageIndex === index }"
              @click="selectedImageIndex = index"
            >
              <img
                :src="resolvePreloadControlledImage(image, selectedProject)"
                :alt="`${selectedProject.title} ${index + 1}`"
                fetchpriority="low"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </article>
    </div>
    </Transition>

    <Transition name="modal-slide" appear>
    <div class="image-modal" v-if="imageModalOpen" @click.self="imageModalOpen = false">
      <button
        class="modal-close"
        @click="imageModalOpen = false"
        aria-label="Close image"
      >
        &times;
      </button>
      <img
        :src="resolveImage(selectedProject.images[selectedImageIndex])"
        :alt="selectedProject.title"
        fetchpriority="high"
      />
    </div>
    </Transition>

    <SkylerBot />
  </main>
</template>

<script>
import SkylerBot from "./components/SkylerBot";
import { experienceItems } from "./data/experience";
import { projects } from "./data/projects";
import {
  getLandingProjectId,
  preloadPortfolioImages,
  resolvePhotoAsset,
} from "./services/imagePreloader";
import {
  notifyExternalSite,
  notifyPortfolioSessionEnd,
  notifyPortfolioView,
  notifyProjectView,
  notifySectionView,
} from "./services/notifications";

export default {
  name: "App",
  components: {
    SkylerBot,
  },
  data() {
    return {
      experienceItems,
      projects,
      currentView: "about",
      previousView: "",
      selectedProject: projects[0],
      selectedImageIndex: 0,
      projectModalOpen: false,
      imageModalOpen: false,
      hasMountedPage: false,
      imagePriorityLoaded: false,
      landingProjectId: "",
      navExitDirection: "nav-fill-back",
      navFillDirection: "nav-fill-forward",
      pageTransitionName: "page-arrive",
      navItems: [
        { id: "about", label: "About" },
        { id: "experience", label: "Experience" },
        { id: "projects", label: "Projects" },
      ],
    };
  },
  mounted() {
    this.syncViewFromUrl();
    this.landingProjectId = getLandingProjectId(this.projects);
    preloadPortfolioImages(this.projects).then(({ landingProjectId }) => {
      this.landingProjectId = landingProjectId || "";
      this.imagePriorityLoaded = true;
    });
    notifyPortfolioView();
    window.addEventListener("popstate", this.syncViewFromUrl);
    window.addEventListener("pagehide", this.handlePortfolioExit);
    window.addEventListener("beforeunload", this.handlePortfolioExit);
  },
  beforeUnmount() {
    window.removeEventListener("popstate", this.syncViewFromUrl);
    window.removeEventListener("pagehide", this.handlePortfolioExit);
    window.removeEventListener("beforeunload", this.handlePortfolioExit);
    this.handlePortfolioExit();
  },
  methods: {
    setView(view, updateUrl = true) {
      this.setCurrentView(view);
      this.projectModalOpen = false;
      this.imageModalOpen = false;
      if (updateUrl) {
        const path = view === "about" ? "/" : `/${view}`;
        this.updatePath(path);
        notifySectionView(view, path);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    openProject(project, updateUrl = true) {
      this.selectedProject = project;
      this.setCurrentView("projects");
      this.selectedImageIndex = 0;
      this.projectModalOpen = true;
      this.imageModalOpen = false;
      if (updateUrl) {
        this.updatePath(`/projects/${project.id}`);
      }
      notifyProjectView(project);
    },
    closeProjectModal(updateUrl = true) {
      this.projectModalOpen = false;
      this.imageModalOpen = false;
      if (updateUrl) {
        this.updatePath("/projects");
      }
    },
    syncViewFromUrl() {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const [section, projectId] = pathParts;

      if (section === "projects") {
        this.setCurrentView("projects");

        if (projectId) {
          const decodedProjectId = decodeURIComponent(projectId);
          const project = this.projects.find(({ id }) => id === decodedProjectId);

          if (project) {
            this.openProject(project, false);
            return;
          }
        }

        this.closeProjectModal(false);
        return;
      }

      if (section === "experience") {
        this.setView("experience", false);
        return;
      }

      this.setView("about", false);
    },
    setCurrentView(view) {
      const isInitialPage = !this.hasMountedPage;

      if (view === this.currentView) {
        this.hasMountedPage = true;
        return;
      }

      const currentIndex = this.navItems.findIndex(({ id }) => id === this.currentView);
      const nextIndex = this.navItems.findIndex(({ id }) => id === view);

      this.pageTransitionName =
        isInitialPage || currentIndex < 0
          ? "page-arrive"
          : nextIndex >= currentIndex
          ? "page-swipe-forward"
          : "page-swipe-back";
      this.navFillDirection =
        isInitialPage || nextIndex >= currentIndex ? "nav-fill-forward" : "nav-fill-back";
      this.navExitDirection =
        this.navFillDirection === "nav-fill-forward" ? "nav-fill-back" : "nav-fill-forward";
      this.previousView = this.currentView;
      this.currentView = view;
      this.hasMountedPage = true;
    },
    getNavButtonClass(view) {
      return {
        active: this.currentView === view,
        exiting: this.previousView === view && this.currentView !== view,
        [this.navFillDirection]: this.currentView === view,
        [this.navExitDirection]: this.previousView === view && this.currentView !== view,
      };
    },
    updatePath(path) {
      const nextPath = this.withSourceQuery(path);
      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (currentPath !== nextPath) {
        window.history.pushState({}, "", nextPath);
      }
    },
    handlePortfolioExit() {
      notifyPortfolioSessionEnd();
    },
    notifyExternalLink(link) {
      notifyExternalSite(link, this.selectedProject);
    },
    withSourceQuery(path) {
      const source = new URLSearchParams(window.location.search).get("source");

      if (!source || path.includes("?")) {
        return path;
      }

      const params = new URLSearchParams({ source });
      return `${path}?${params.toString()}`;
    },
    resolveImage(image) {
      return resolvePhotoAsset(image);
    },
    resolvePreloadControlledImage(image, project) {
      if (
        this.imagePriorityLoaded ||
        !this.landingProjectId ||
        (project && project.id === this.landingProjectId)
      ) {
        return this.resolveImage(image);
      }

      return "";
    },
    previousImage() {
      const imageCount = this.selectedProject.images.length;
      this.selectedImageIndex = (this.selectedImageIndex - 1 + imageCount) % imageCount;
    },
    nextImage() {
      const imageCount = this.selectedProject.images.length;
      this.selectedImageIndex = (this.selectedImageIndex + 1) % imageCount;
    },
  },
};
</script>

<style lang="scss">
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

#app {
  margin: 0;
  background: radial-gradient(
      circle at top left,
      rgba(255, 196, 87, 0.28),
      transparent 32rem
    ),
    linear-gradient(135deg, #f8efe5 0%, #edf7f6 46%, #f6edf8 100%);
  color: #213136;
  font-family: "Century Gothic", Arial, sans-serif;
  min-height:99vh;
}

button,
a {
  font-family: inherit;
}

button {
  color: inherit;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto;
  gap: 18px;
  align-items: center;
  border-bottom: 1px solid rgba(38, 113, 111, 0.2);
  background: rgba(255, 250, 244, 0.9);
  padding: 14px 28px;
  backdrop-filter: blur(12px);
}

.brand {
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.brand span {
  display: block;
  color: #193a5a;
  font-size: 20px;
  font-weight: 800;
}

.brand small {
  color: #6b6474;
}

nav {
  display: flex;
  gap: 8px;
}

nav button,
.resume-link,
.about-actions button,
.detail-links a {
  min-height: 40px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}

nav button,
.about-actions button {
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
}

nav button {
  isolation: isolate;
  outline: none;
  transition:
    border-color 180ms ease,
    color 180ms ease;
}

nav button span {
  position: relative;
  z-index: 1;
}

nav button::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: #193a5a;
  content: "";
  transform: scaleX(0);
  transition: transform 260ms ease;
}

nav button.active {
  border-color: transparent;
  background: transparent;
  color: #ffffff;
}

.about-actions button:first-child {
  border-color: #193a5a;
  background: #193a5a;
  color: #ffffff;
}

nav button.nav-fill-forward::before {
  transform-origin: left center;
}

nav button.nav-fill-back::before {
  transform-origin: right center;
}

nav button.active::before {
  transform: scaleX(1);
}

nav button:not(.active):hover {
  border-color: #193a5a;
  background: transparent;
  color: #193a5a;
}

nav button:focus-visible {
  outline: 2px solid #f18f55;
  outline-offset: 2px;
}

.resume-link,
.detail-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #f18f55;
  color: #193a5a;
  background: #fff7ed;
}

.page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 36px 0;
}

.page-stage {
  position: relative;
  overflow: hidden;
}

.page-arrive-enter-active {
  transition:
    opacity 420ms ease,
    transform 420ms ease,
    visibility 420ms ease;
  will-change: opacity, transform;
}

.page-arrive-enter-from {
  opacity: 0;
  transform: translateY(34px);
  visibility: hidden;
}

.page-arrive-enter-to {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.page-swipe-forward-enter-active,
.page-swipe-forward-leave-active,
.page-swipe-back-enter-active,
.page-swipe-back-leave-active {
  transition:
    opacity 380ms ease,
    transform 380ms ease,
    visibility 380ms ease;
  will-change: opacity, transform;
}

.page-swipe-forward-leave-active,
.page-swipe-back-leave-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.page-swipe-forward-enter-from,
.page-swipe-back-enter-from,
.page-swipe-forward-leave-to,
.page-swipe-back-leave-to {
  opacity: 0;
  visibility: hidden;
}

.page-swipe-forward-enter-from {
  transform: translateX(100%);
}

.page-swipe-forward-leave-to {
  transform: translateX(-100%);
}

.page-swipe-back-enter-from {
  transform: translateX(-100%);
}

.page-swipe-back-leave-to {
  transform: translateX(100%);
}

.page-swipe-forward-enter-to,
.page-swipe-forward-leave-from,
.page-swipe-back-enter-to,
.page-swipe-back-leave-from {
  opacity: 1;
  transform: translateX(0);
  visibility: visible;
}

.eyebrow {
  margin: 0 0 8px;
  color: #a3442f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  max-width: 780px;
  color: #193a5a;
  font-size: 42px;
  line-height: 1.08;
}

h2 {
  color: #193a5a;
}

p {
  color: #5f5b68;
  line-height: 1.55;
}

.about-page {
  min-height: calc(100vh - 70px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 42px;
  align-items: center;
}

.about-copy p {
  max-width: 740px;
  font-size: 18px;
}

.about-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.about-actions button:last-child {
  border-color: #f18f55;
  background: rgba(255, 247, 237, 0.8);
}

.about-page img {
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 8px;
  object-fit: cover;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  margin-bottom: 22px;
}

.page-heading h1 {
  margin-bottom: 0;
  font-size: 32px;
}

.compact-heading {
  margin-bottom: 16px;
}

.experience-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.experience-grid article {
  min-height: 255px;
  border: 1px solid rgba(38, 113, 111, 0.18);
  border-radius: 8px;
  background: rgba(255, 250, 244, 0.88);
  padding: 22px;
  box-shadow: 0 14px 30px rgba(25, 58, 90, 0.08);
}

.experience-grid article > span,
.project-type {
  color: #a3442f;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.experience-grid h2 {
  margin: 10px 0;
  font-size: 23px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.tag-list span {
  border-radius: 999px;
  background: #ddf3ef;
  color: #17635f;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 800;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.project-card {
  display: grid;
  min-height: 210px;
  overflow: hidden;
  border: 1px solid rgba(38, 113, 111, 0.18);
  border-radius: 8px;
  background: rgba(255, 250, 244, 0.9);
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.project-card:hover,
.project-card:focus-visible {
  border-color: #26716f;
  box-shadow: 0 16px 32px rgba(25, 58, 90, 0.15);
}


.project-card-body {
  padding: 16px;
}

.project-card h2 {
  margin: 8px 0;
  font-size: 21px;
}

.project-card p {
  margin-bottom: 0;
  font-size: 14px;
}
.project-card img {
  width: 100%;             /* Fills the card's width */
  height: 250px;           /* Forces the 250px height */
  object-fit: cover;       /* Scales image to fill the space without distortion */
  object-position: top;    /* Aligns the top of the image to the top of the container */
}


.impact {
  color: #17635f;
  font-weight: 800;
}

.carousel {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 36px;
  gap: 8px;
  align-items: center;
  margin: 16px 0;
}

.carousel button {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(38, 113, 111, 0.28);
  border-radius: 50%;
  background: #fff7ed;
  color: #193a5a;
  font-size: 26px;
  cursor: pointer;
}

.carousel-image-wrap {
  position: relative;
  min-width: 0;
}

.carousel img {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  object-fit: contain;
  background: #14314f;
  cursor: zoom-in;
}

.magnify-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 250, 244, 0.92);
  color: #193a5a;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(20, 49, 79, 0.22);
}

.detail-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-modal-backdrop,
.image-modal {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(25, 58, 90, 0.72);
  padding: 28px;
}

.project-modal {
  position: relative;
  display: grid;
  grid-template-columns: minmax(290px, 0.75fr) minmax(0, 1.25fr);
  gap: 26px;
  width: min(1120px, 100%);
  max-height: min(980px, calc(100vh - 56px));
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(255, 247, 237, 0.98),
    rgba(237, 247, 246, 0.98)
  );
  padding: 28px;
  box-shadow: 0 24px 70px rgba(20, 49, 79, 0.35);
}

.project-modal h2 {
  margin: 8px 44px 12px 0;
  font-size: 34px;
}

.project-modal-copy p {
  font-size: 15px;
}

.modal-tags {
  margin-bottom: 18px;
}

.project-modal-media {
  min-width: 0;
}

.thumbnail-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 96px;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.thumbnail-row button {
  border: 2px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.thumbnail-row button.active {
  border-color: #f18f55;
}

.thumbnail-row img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  object-fit: cover;
}

.image-modal img {
  max-width: 92vw;
  max-height: 86vh;
  border-radius: 8px;
  object-fit: contain;
  background: #14314f;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #193a5a;
  color: #ffffff;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
}

.image-modal .modal-close {
  position: fixed;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition:
    opacity 260ms ease,
    visibility 260ms ease;
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
  visibility: hidden;
}

.modal-slide-enter-to,
.modal-slide-leave-from {
  opacity: 1;
  visibility: visible;
}

.modal-slide-enter-active .project-modal,
.modal-slide-leave-active .project-modal,
.modal-slide-enter-active > img,
.modal-slide-leave-active > img {
  transition: transform 260ms ease;
}

.modal-slide-enter-from .project-modal,
.modal-slide-leave-to .project-modal,
.modal-slide-enter-from > img,
.modal-slide-leave-to > img {
  transform: translateY(44px);
}

.modal-slide-enter-to .project-modal,
.modal-slide-leave-from .project-modal,
.modal-slide-enter-to > img,
.modal-slide-leave-from > img {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .page-arrive-enter-active,
  .page-swipe-forward-enter-active,
  .page-swipe-forward-leave-active,
  .page-swipe-back-enter-active,
  .page-swipe-back-leave-active,
  .modal-slide-enter-active,
  .modal-slide-leave-active,
  .modal-slide-enter-active .project-modal,
  .modal-slide-leave-active .project-modal,
  .modal-slide-enter-active > img,
  .modal-slide-leave-active > img {
    transition-duration: 1ms;
  }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: #193a5a;
  border-radius: 4px;
}

::-webkit-scrollbar-track {
  background-color: #ffe9cb;
}

@media screen and (max-width: 1050px) {
  .about-page {
    grid-template-columns: 1fr;
  }

  .project-modal {
    grid-template-columns: 1fr;
    max-height: calc(100vh - 36px);
  }

  .about-page img {
    max-width: 320px;
  }
}

@media screen and (max-width: 760px) {
  .site-header {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px 6px;
    padding: 12px 16px;
  }

  .brand {
    grid-column: 1 / -1;
  }

  nav {
    display: grid;
    grid-column: 1 / span 3;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    min-width: 0;
  }

  .resume-link {
    grid-column: 4;
    width: auto;
  }

  nav button,
  .resume-link {
    min-width: 0;
    padding: 0 5px;
    font-size: 12px;
    white-space: nowrap;
  }

  .page {
    width: min(100% - 22px, 1180px);
    padding: 24px 0;
  }

  h1,
  .page-heading h1 {
    font-size: 30px;
  }

  .page-heading,
  .experience-grid,
  .project-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .project-card {
    grid-template-columns: 120px minmax(0, 1fr);
  }

}

@media screen and (max-width: 520px) {


  .project-modal-backdrop {
    align-items: stretch;
    padding: 0;
  }

  .project-modal {
    width: 100%;
    max-height: none;
    min-height: 100vh;
    border-radius: 0;
    padding: 22px 14px;
  }

  .project-modal h2 {
    font-size: 28px;
  }

  .carousel {
    grid-template-columns: 32px minmax(0, 1fr) 32px;
  }

  .carousel button {
    width: 32px;
    height: 32px;
  }
}
</style>
