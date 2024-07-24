<template>
  <div class="project">
    <h2>{{ title }}</h2>
    <p class="timeframe">{{ timeframe }}</p>
    <!-- <img :src="image" :alt="title" class="project-image" /> -->
    <div class="carousel">
      <div class="carousel-content">
        <div
          v-for="(image, index) in resolvedImages"
          :key="index"
          class="carousel-item"
        >
          <img
            :src="image"
            @click="openModal(image)"
            :alt="title"
            class="project-image"
          />
        </div>
      </div>
    </div>
    <p class="description">{{ description }}</p>
    <ul class="links">
      <li v-for="(link, index) in links" :key="index">
        <a :href="link.url" target="_blank">{{ link.name }}</a>
      </li>
    </ul>
    <!-- Modal -->
    <div class="modal" v-if="showModal">
      <span class="close" @click="closeModal">&times;</span>
      <img :src="modalImage" alt="Enlarged Image" class="modal-image" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectComponent',
  props: {
    title: String,
    timeframe: String,
    description: String,
    image: String,
    images: Array,
    links: Array,
  },
  data() {
    return {
      showModal: false,
      modalImage: '',
    };
  },

  computed: {
    resolvedImages() {
      return this.images.map(image => {
        try {
          return require(`@/assets/photos/${image}`);
        } catch (e) {
          console.error(e);
          return image;
        }
      });
    },
  },
  methods: {
    openModal(image) {
      console.log('enlarge' + image);
      this.modalImage = image;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
  },
};
</script>

<style scoped>
.modal {
  position: fixed;
  z-index: 1;
  padding-top: 20px;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  text-align: center;
}

.modal-image {
  max-width: 80%;
  max-height: 80%;
  margin: 0 auto;
  display: block;
}

.close {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 24px;
  cursor: pointer;
  color: white;
}

.modal:target {
  display: block;
}
.project {
  width: 600px;
  border: 0px solid #004d7a; /* Navy blue border */
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  background-color: #f0f9ff; /* Light blue background */
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1); /* subtle shadow */
  text-align: center;
}

.project h2 {
  color: #003d5b; /* Darker blue for the title */
  font-size: 30px;
  text-decoration: underline;
}

.timeframe {
  color: #0077b6; /* Bright blue for the timeframe */
  font-style: italic;
}

.project-image {
  height: 300px;
  border-radius: 4px;
  cursor: pointer;
}
.carousel {
  overflow: hidden;
  position: relative;
  width: 100%;
}
.carousel-content {
  display: flex;
  overflow-x: auto; /* Enable horizontal scrolling */
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin; /* Set the scrollbar width to thin */
  scrollbar-color: #0077b6 #ababab; /* Set the scrollbar color */
  /* You can adjust the colors as per your preference */
}
.carousel-content::-webkit-scrollbar {
  width: 8px; /* Set the scrollbar width */
  height: 8px; /* Set the scrollbar height */
}

.carousel-content::-webkit-scrollbar-thumb {
  background-color: #5a7c8e; /* Set the thumb color */
  border-radius: 4px; /* Round the thumb edges */
}

.carousel-content::-webkit-scrollbar-track {
  background-color: #e5e5e5; /* Set the track color */
  border-radius: 4px; /* Round the track edges */
}

.carousel-content::before {
  left: 0;
}

.carousel-content::after {
  right: 0;
}

.carousel-item {
  flex: 0 0 auto;
  scroll-snap-align: start;
  margin-right: 10px; /* Add some space between images */
}

.description {
  color: #005f73; /* Slightly darker blue for text */
  text-align: left;
  padding-left: 20px;
  padding-right: 20px;
}

.links {
  list-style-type: none; /* removes bullet points */
  padding: 0;
}

.links li a {
  color: #00b4d8; /* Sky blue for links */
  text-decoration: none; /* removes underline */
}

.links li a:hover {
  text-decoration: underline; /* adds underline on hover */
}
@media screen and (min-width: 1600px) {
  .description {
    font-size: 18px;
  }
  .links {
    font-size: 18px;
  }
  .project-image {
    height: 300px;
    cursor: pointer;
  }
  .project h2 {
    color: #003d5b; /* Darker blue for the title */
    font-size: 30px;
  }
  .project {
    width: 800px;
  }
}
@media screen and (max-width: 650px) {
  .project-image {
    height: 150px;
    border-radius: 4px;
    cursor: pointer;
  }
  .project h2 {
    color: #003d5b; /* Darker blue for the title */
    font-size: 20px;
    text-decoration: underline;
  }
  .project {
    width: 300px;
  }
}
</style>
