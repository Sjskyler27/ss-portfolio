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
        <section
          v-if="currentView === 'about'"
          key="about"
          class="page about-page"
        >
          <div class="about-copy">
            <h2>
              Full-stack developer focused on product workflows, AI-assisted
              development, and building software people actually use.
            </h2>

            <p>
              I work across frontend systems, backend services, mobile apps, and
              deployment tooling with experience in Vue, Flutter, React, Node,
              and modern AI-assisted engineering workflows.
            </p>

            <p>
              A lot of my work centers around improving messy operational
              processes — onboarding, credentialing, admin tooling, automations,
              and internal workflows — by turning them into maintainable
              products with clean user experiences.
            </p>

            <p>
              I enjoy learning new stacks quickly, building practical systems
              end-to-end, and combining product thinking with implementation.
            </p>

            <div class="about-actions">
              <button @click="setView('projects')">See Projects</button>
              <button @click="setView('experience')">View Experience</button>
            </div>
          </div>

          <img
            src="./assets/photos/skylersimpson.png"
            alt="Skyler Simpson"
            fetchpriority="high"
          />
        </section>

        <section
          v-else-if="currentView === 'experience'"
          key="experience"
          class="page experience-page"
        >
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

        <section
          v-else-if="currentView === 'projects'"
          key="projects"
          class="page projects-page"
        >
          <div class="project-toolbar compact-heading">
            <h1 class="eyebrow">Projects</h1>
            <button
              class="project-filter-toggle"
              type="button"
              :class="{
                active: projectFiltersOpen,
                applied: hasActiveProjectFilters,
              }"
              :aria-expanded="projectFiltersOpen.toString()"
              aria-controls="project-controls"
              aria-label="Toggle project filters"
              @click="projectFiltersOpen = !projectFiltersOpen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>

          <Transition name="project-filter-panel">
            <div
              v-if="projectFiltersOpen"
              id="project-controls"
              class="project-controls"
              aria-label="Project sorting and filters"
            >
              <label>
                <span>Search</span>
                <input
                  v-model.trim="projectSearch"
                  type="search"
                  placeholder="Project, skill, or keyword"
                />
              </label>

              <label>
                <span>Sort</span>
                <select v-model="projectSort">
                  <option
                    v-for="option in projectSortOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label>
                <span>Type</span>
                <select v-model="projectGroupFilter">
                  <option value="">All types</option>
                  <option
                    v-for="group in projectGroupOptions"
                    :key="group"
                    :value="group"
                  >
                    {{ formatFilterLabel(group) }}
                  </option>
                </select>
              </label>

              <div class="project-tech-filter">
                <span>Tech</span>
                <div
                  class="project-tech-options"
                  role="group"
                  aria-label="Tech filters"
                >
                  <label v-for="tech in projectTechOptions" :key="tech">
                    <input
                      v-model="projectTechFilters"
                      type="checkbox"
                      :value="tech"
                    />
                    <span>{{ tech }}</span>
                  </label>
                </div>
              </div>

              <button
                class="project-filter-reset"
                type="button"
                @click="resetProjectFilters"
              >
                Reset
              </button>
            </div>
          </Transition>

          <p class="project-result-count">
            {{ visibleProjects.length }} of {{ readyProjects.length }} projects
          </p>

          <TransitionGroup name="project-list" tag="div" class="project-grid">
            <button
              v-for="project in visibleProjects"
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
                  <span v-for="tech in project.tech" :key="tech">{{
                    tech
                  }}</span>
                </div>
              </div>
            </button>
          </TransitionGroup>

          <p v-if="!visibleProjects.length" class="project-empty-state">
            No projects match those filters.
          </p>
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
              <span v-for="tech in selectedProject.tech" :key="tech">{{
                tech
              }}</span>
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
              <button @click="previousImage" aria-label="Previous image">
                &#8249;
              </button>
              <div class="carousel-image-wrap" @click="imageModalOpen = true">
                <img
                  :src="
                    resolveImage(selectedProject.images[selectedImageIndex])
                  "
                  :alt="selectedProject.title"
                  fetchpriority="high"
                />
                <span aria-hidden="true" class="magnify-icon">&#128269;</span>
              </div>
              <button @click="nextImage" aria-label="Next image">
                &#8250;
              </button>
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
      <div
        class="image-modal"
        v-if="imageModalOpen"
        @click.self="imageModalOpen = false"
      >
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
import SkylerBot from './components/SkylerBot';
import { experienceItems } from './data/experience';
import { projects } from './data/projects';
import {
  getLandingProjectId,
  preloadPortfolioImages,
  resolvePhotoAsset,
} from './services/imagePreloader';
import { getCurrentSource } from './services/sourceInfo';
import {
  notifyExternalSite,
  notifyPortfolioSessionEnd,
  notifyPortfolioView,
  notifyProjectView,
  notifySectionView,
} from './services/notifications';

export default {
  name: 'App',
  components: {
    SkylerBot,
  },
  data() {
    return {
      experienceItems,
      projects,
      projectSearch: '',
      projectSort: 'favorites',
      sourceProjectOrder: [],
      projectGroupFilter: '',
      projectTechFilters: [],
      projectFiltersOpen: false,
      projectSortOptions: [
        { value: 'relevant', label: 'Most Relevant' },
        { value: 'favorites', label: "Skyler's Favorites" },
        { value: 'title', label: 'Project Name' },
        { value: 'type', label: 'Project Type' },
        { value: 'techCount', label: 'Most Tech' },
      ],
      currentView: 'about',
      previousView: '',
      selectedProject: projects[0],
      selectedImageIndex: 0,
      projectModalOpen: false,
      imageModalOpen: false,
      hasMountedPage: false,
      imagePriorityLoaded: false,
      landingProjectId: '',
      navExitDirection: 'nav-fill-back',
      navFillDirection: 'nav-fill-forward',
      pageTransitionName: 'page-arrive',
      navItems: [
        { id: 'about', label: 'About' },
        { id: 'experience', label: 'Experience' },
        { id: 'projects', label: 'Projects' },
      ],
    };
  },
  computed: {
    readyProjects() {
      return this.projects.filter((project) => !project.notReady);
    },
    projectGroupOptions() {
      return this.getUniqueProjectValues('group');
    },
    projectTechOptions() {
      return [
        ...new Set(this.readyProjects.flatMap((project) => project.tech || [])),
      ].sort((a, b) => a.localeCompare(b));
    },
    visibleProjects() {
      const search = this.projectSearch.toLowerCase();
      const filteredProjects = this.readyProjects.filter((project) => {
        const projectTech = project.tech || [];
        const matchesSearch =
          !search ||
          [
            project.title,
            project.type,
            project.summary,
            project.impact,
            project.description,
            project.group,
            project.category,
            ...(project.tech || []),
          ]
            .join(' ')
            .toLowerCase()
            .includes(search);

        return (
          matchesSearch &&
          (!this.projectGroupFilter ||
            project.group === this.projectGroupFilter) &&
          (!this.projectTechFilters.length ||
            this.projectTechFilters.every((tech) => projectTech.includes(tech)))
        );
      });

      return [...filteredProjects].sort((a, b) => {
        if (this.projectSort === 'title') {
          return a.title.localeCompare(b.title);
        }

        if (this.projectSort === 'relevant') {
          return (
            this.getRelevantProjectIndex(a) - this.getRelevantProjectIndex(b) ||
            this.getFavoriteProjectIndex(a) - this.getFavoriteProjectIndex(b)
          );
        }

        if (this.projectSort === 'type') {
          return (
            a.type.localeCompare(b.type) ||
            this.getFavoriteProjectIndex(a) - this.getFavoriteProjectIndex(b)
          );
        }

        if (this.projectSort === 'techCount') {
          return (
            (b.tech || []).length - (a.tech || []).length ||
            this.getFavoriteProjectIndex(a) - this.getFavoriteProjectIndex(b)
          );
        }

        return (
          this.getFavoriteProjectIndex(a) - this.getFavoriteProjectIndex(b)
        );
      });
    },
    hasActiveProjectFilters() {
      return Boolean(
        this.projectSearch ||
          this.projectSort !== this.getDefaultProjectSort() ||
          this.projectGroupFilter ||
          this.projectTechFilters.length,
      );
    },
  },
  mounted() {
    this.syncViewFromUrl();
    this.initializeSourceProjectSort();
    this.landingProjectId = getLandingProjectId(this.readyProjects);
    preloadPortfolioImages(this.readyProjects).then(({ landingProjectId }) => {
      this.landingProjectId = landingProjectId || '';
      this.imagePriorityLoaded = true;
    });
    notifyPortfolioView();
    window.addEventListener('popstate', this.syncViewFromUrl);
    window.addEventListener('pagehide', this.handlePortfolioExit);
    window.addEventListener('beforeunload', this.handlePortfolioExit);
  },
  beforeUnmount() {
    window.removeEventListener('popstate', this.syncViewFromUrl);
    window.removeEventListener('pagehide', this.handlePortfolioExit);
    window.removeEventListener('beforeunload', this.handlePortfolioExit);
    this.handlePortfolioExit();
  },
  methods: {
    getUniqueProjectValues(key) {
      return [
        ...new Set(
          this.readyProjects.map((project) => project[key]).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b));
    },
    getFavoriteProjectIndex(project) {
      return this.projects.findIndex(({ id }) => id === project.id);
    },
    getRelevantProjectIndex(project) {
      const index = this.sourceProjectOrder.indexOf(project.id);

      return index >= 0 ? index : this.projects.length;
    },
    getDefaultProjectSort() {
      return getCurrentSource() ? 'relevant' : 'favorites';
    },
    formatFilterLabel(value) {
      return String(value)
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
    resetProjectFilters() {
      this.projectSearch = '';
      this.projectSort = this.getDefaultProjectSort();
      this.projectGroupFilter = '';
      this.projectTechFilters = [];
    },
    async initializeSourceProjectSort() {
      const source = getCurrentSource();

      if (!source) {
        return;
      }

      this.projectSort = 'relevant';

      try {
        const response = await fetch('/.netlify/functions/source-project-sort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source }),
        });
        const payload = await response.json();

        if (response.ok && Array.isArray(payload.projectIds)) {
          this.sourceProjectOrder = payload.projectIds;
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to load source project sort', error);
        }
      }
    },
    setView(view, updateUrl = true) {
      this.setCurrentView(view);
      this.projectModalOpen = false;
      this.imageModalOpen = false;
      if (updateUrl) {
        const path = view === 'about' ? '/' : `/${view}`;
        this.updatePath(path);
        notifySectionView(view, path);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    openProject(project, updateUrl = true) {
      this.selectedProject = project;
      this.setCurrentView('projects');
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
        this.updatePath('/projects');
      }
    },
    syncViewFromUrl() {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const [section, projectId] = pathParts;

      if (section === 'projects') {
        this.setCurrentView('projects');

        if (projectId) {
          const decodedProjectId = decodeURIComponent(projectId);
          const project = this.readyProjects.find(
            ({ id }) => id === decodedProjectId,
          );

          if (project) {
            this.openProject(project, false);
            return;
          }
        }

        this.closeProjectModal(false);
        return;
      }

      if (section === 'experience') {
        this.setView('experience', false);
        return;
      }

      this.setView('about', false);
    },
    setCurrentView(view) {
      const isInitialPage = !this.hasMountedPage;

      if (view === this.currentView) {
        this.hasMountedPage = true;
        return;
      }

      const currentIndex = this.navItems.findIndex(
        ({ id }) => id === this.currentView,
      );
      const nextIndex = this.navItems.findIndex(({ id }) => id === view);

      this.pageTransitionName =
        isInitialPage || currentIndex < 0
          ? 'page-arrive'
          : nextIndex >= currentIndex
          ? 'page-swipe-forward'
          : 'page-swipe-back';
      this.navFillDirection =
        isInitialPage || nextIndex >= currentIndex
          ? 'nav-fill-forward'
          : 'nav-fill-back';
      this.navExitDirection =
        this.navFillDirection === 'nav-fill-forward'
          ? 'nav-fill-back'
          : 'nav-fill-forward';
      this.previousView = this.currentView;
      this.currentView = view;
      this.hasMountedPage = true;
    },
    getNavButtonClass(view) {
      return {
        active: this.currentView === view,
        exiting: this.previousView === view && this.currentView !== view,
        [this.navFillDirection]: this.currentView === view,
        [this.navExitDirection]:
          this.previousView === view && this.currentView !== view,
      };
    },
    updatePath(path) {
      const nextPath = this.withSourceQuery(path);
      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (currentPath !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    },
    handlePortfolioExit() {
      notifyPortfolioSessionEnd();
    },
    notifyExternalLink(link) {
      notifyExternalSite(link, this.selectedProject);
    },
    withSourceQuery(path) {
      const source = getCurrentSource();

      if (!source || path.includes('?')) {
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

      return '';
    },
    previousImage() {
      const imageCount = this.selectedProject.images.length;
      this.selectedImageIndex =
        (this.selectedImageIndex - 1 + imageCount) % imageCount;
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
  font-family: 'Century Gothic', Arial, sans-serif;
  min-height: 99vh;
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
  color: #124a80;
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
  transition: border-color 180ms ease, color 180ms ease;
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
  background: #124a80;
  content: '';
  transform: scaleX(0);
  transition: transform 260ms ease;
}

nav button.active {
  border-color: transparent;
  background: transparent;
  color: #ffffff;
}

.about-actions button:first-child {
  border-color: #124a80;
  background: #124a80;
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
  border-color: #124a80;
  background: transparent;
  color: #124a80;
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
  color: #124a80;
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
  transition: opacity 420ms ease, transform 420ms ease, visibility 420ms ease;
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
  transition: opacity 380ms ease, transform 380ms ease, visibility 380ms ease;
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
  color: #124a80;
  font-size: 42px;
  line-height: 1.08;
}

h2 {
  color: #124a80;
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

.project-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.project-toolbar h1 {
  margin-bottom: 0;
  font-size: 32px;
}

.project-filter-toggle {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(18, 74, 128, 0.2);
  border-radius: 8px;
  background: rgba(255, 250, 244, 0.88);
  color: #124a80;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, color 180ms ease,
    transform 180ms ease;
}

.project-filter-toggle svg {
  width: 22px;
  height: 22px;
}

.project-filter-toggle:hover,
.project-filter-toggle:focus-visible,
.project-filter-toggle.active {
  border-color: #124a80;
  background: #124a80;
  color: #ffffff;
}

.project-filter-toggle:focus-visible {
  outline: 2px solid #f18f55;
  outline-offset: 2px;
}

.project-filter-toggle.applied::after {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border: 2px solid rgba(255, 250, 244, 0.96);
  border-radius: 50%;
  background: #f18f55;
  content: '';
}

.project-controls {
  display: grid;
  grid-template-columns:
    minmax(220px, 1.25fr) minmax(150px, 0.75fr) minmax(140px, 0.7fr)
    minmax(190px, 1fr) auto;
  gap: 10px;
  align-items: end;
  margin-bottom: 10px;
  border: 1px solid rgba(38, 113, 111, 0.18);
  border-radius: 8px;
  background: rgba(255, 250, 244, 0.82);
  padding: 12px;
}

.project-filter-panel-enter-active,
.project-filter-panel-leave-active {
  overflow: hidden;
  transition: opacity 220ms ease, transform 220ms ease, max-height 220ms ease,
    margin-bottom 220ms ease, padding-top 220ms ease, padding-bottom 220ms ease;
}

.project-filter-panel-enter-from,
.project-filter-panel-leave-to {
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateY(-8px);
}

.project-filter-panel-enter-to,
.project-filter-panel-leave-from {
  max-height: 260px;
  opacity: 1;
  transform: translateY(0);
}

.project-controls > label,
.project-tech-filter {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.project-controls > label > span,
.project-tech-filter > span {
  color: #17635f;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.project-controls input,
.project-controls select,
.project-filter-reset {
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(18, 74, 128, 0.22);
  border-radius: 8px;
  color: #213136;
  font: inherit;
  font-size: 14px;
}

.project-controls input,
.project-controls select {
  background-color: #ffffff;
  padding: 0 10px;
}

.project-controls select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #124a80 50%),
    linear-gradient(135deg, #124a80 50%, transparent 50%),
    linear-gradient(to right, rgba(18, 74, 128, 0.12), rgba(18, 74, 128, 0.12));
  background-position: calc(100% - 18px) 17px, calc(100% - 13px) 17px,
    calc(100% - 36px) 8px;
  background-repeat: no-repeat;
  background-size: 5px 5px, 5px 5px, 1px 24px;
  padding-right: 46px;
  cursor: pointer;
}

.project-controls input:focus,
.project-controls select:focus,
.project-filter-reset:focus-visible {
  border-color: #f18f55;
  outline: 2px solid rgba(241, 143, 85, 0.24);
  outline-offset: 1px;
}

.project-tech-filter:focus-within .project-tech-options {
  border-color: #f18f55;
  outline: 2px solid rgba(241, 143, 85, 0.24);
  outline-offset: 1px;
}

.project-tech-filter {
  position: relative;
  z-index: 1;
  margin: 0;
  min-height: 56px;
  padding: 0;
}

.project-tech-options {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  height: 40px;
  overflow-y: auto;
  border: 1px solid rgba(18, 74, 128, 0.22);
  border-radius: 8px;
  background: #ffffff;
  padding: 3px 6px;
  scrollbar-color: #124a80 #fffaf4;
  scrollbar-width: thin;
  transition: bottom 160ms ease, height 160ms ease, box-shadow 160ms ease;
}

.project-tech-filter:hover,
.project-tech-filter:focus-within {
  z-index: 2;
}

.project-tech-filter:hover .project-tech-options,
.project-tech-filter:focus-within .project-tech-options {
  bottom: -50px;
  height: 110px;
  box-shadow: 0 10px 22px rgba(18, 74, 128, 0.14);
}

.project-tech-options label {
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr);
  gap: 5px;
  align-items: center;
  min-height: 21px;
  border-radius: 5px;
  padding: 1px 4px;
  cursor: pointer;
}

.project-tech-options label:hover,
.project-tech-options label:focus-within {
  background: #edf7f6;
}

.project-tech-options input {
  width: 12px;
  min-height: 12px;
  accent-color: #124a80;
}

.project-tech-options span {
  overflow: hidden;
  color: #213136;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-filter-reset {
  padding: 0 14px;
  border-color: #f18f55;
  background: #fff7ed;
  color: #124a80;
  font-weight: 800;
  cursor: pointer;
}

.project-result-count {
  margin: 0 0 14px;
  color: #6b6474;
  font-size: 13px;
  font-weight: 800;
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
  box-shadow: 0 14px 30px rgba(18, 74, 128, 0.08);
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
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.project-list-move,
.project-list-enter-active,
.project-list-leave-active {
  transition: opacity 180ms ease, transform 220ms ease;
}

.project-list-enter-from,
.project-list-leave-to {
  opacity: 0;
  transform: scale(0.985);
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
  box-shadow: 0 16px 32px rgba(18, 74, 128, 0.15);
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
  width: 100%; /* Fills the card's width */
  height: 250px; /* Forces the 250px height */
  object-fit: cover; /* Scales image to fill the space without distortion */
  object-position: top; /* Aligns the top of the image to the top of the container */
}

.project-empty-state {
  margin: 24px 0 0;
  border: 1px dashed rgba(38, 113, 111, 0.32);
  border-radius: 8px;
  background: rgba(255, 250, 244, 0.72);
  padding: 18px;
  color: #5f5b68;
  text-align: center;
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
  color: #124a80;
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
  background: #124a80;
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
  color: #124a80;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(18, 74, 128, 0.22);
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
  background: rgba(18, 74, 128, 0.72);
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
  box-shadow: 0 24px 70px rgba(18, 74, 128, 0.35);
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
  background: #124a80;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #124a80;
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
  transition: opacity 260ms ease, visibility 260ms ease;
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
  background-color: #124a80;
  border-radius: 4px;
}

::-webkit-scrollbar-track {
  background-color: #fffaf4;
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

  .project-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .project-controls label:first-child,
  .project-tech-filter,
  .project-filter-reset {
    grid-column: 1 / -1;
  }

  .project-card {
    grid-template-columns: 120px minmax(0, 1fr);
  }
}

@media screen and (max-width: 520px) {
  .project-controls {
    grid-template-columns: 1fr;
  }

  .project-controls label:first-child,
  .project-tech-filter,
  .project-filter-reset {
    grid-column: auto;
  }

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
