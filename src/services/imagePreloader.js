const photoContext = require.context("../assets/photos", true, /\.(png|jpe?g|webp|gif)$/);
const skylerPhoto = "skylersimpson.png";
const loadedImages = new Set();

function uniqueImages(images) {
  return [...new Set(images.filter(Boolean))];
}

function resolvePhotoAsset(image) {
  if (!image) {
    return "";
  }

  if (image.startsWith("http")) {
    return image;
  }

  try {
    return photoContext(`./${image}`);
  } catch (error) {
    return image;
  }
}

function loadImage(image) {
  const src = resolvePhotoAsset(image);

  if (!src || loadedImages.has(src)) {
    return Promise.resolve();
  }

  loadedImages.add(src);

  return new Promise((resolve) => {
    const loader = new Image();
    loader.onload = resolve;
    loader.onerror = resolve;
    loader.src = src;
  });
}

function getLandingProject(projects, path) {
  const [, section, projectId] = path.split("/");

  if (section !== "projects" || !projectId) {
    return null;
  }

  const decodedProjectId = decodeURIComponent(projectId);
  return projects.find(({ id }) => id === decodedProjectId) || null;
}

function getLandingProjectId(projects, path = window.location.pathname) {
  const landingProject = getLandingProject(projects, path);
  return (landingProject && landingProject.id) || "";
}

function getProjectImages(projects) {
  return projects.flatMap(({ images }) => images || []);
}

async function preloadRemainingImages(images) {
  const remainingImages = uniqueImages(images).filter(
    (image) => !loadedImages.has(resolvePhotoAsset(image))
  );
  const concurrency = 3;
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (nextIndex < remainingImages.length) {
        const image = remainingImages[nextIndex];
        nextIndex += 1;
        await loadImage(image);
      }
    })
  );
}

export async function preloadPortfolioImages(projects, path = window.location.pathname) {
  const landingProject = getLandingProject(projects, path);
  const allProjectImages = getProjectImages(projects);
  const priorityImages = landingProject
    ? [...(landingProject.images || []), skylerPhoto]
    : [skylerPhoto];
  const allImages = uniqueImages([...priorityImages, ...allProjectImages, skylerPhoto]);

  for (const image of uniqueImages(priorityImages)) {
    await loadImage(image);
  }

  preloadRemainingImages(allImages);

  return {
    landingProjectId: landingProject && landingProject.id,
    priorityImages: uniqueImages(priorityImages),
  };
}

export { getLandingProjectId, resolvePhotoAsset };
