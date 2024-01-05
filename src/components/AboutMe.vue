<template>
  <div
    id="about-me-wrapper"
    @mouseover="showAboutMe = true"
    @mouseleave="showAboutMe = false"
  >
    <div id="about-me-inner">
      <div v-if="!showAboutMe" class="profile-image-container">
        <img
          src="../assets/photos/skylersimpson.jpg"
          alt="Profile Image"
          class="profile-image"
        />
      </div>
      <div v-else>
        <div class="text-content">
          <h2>About Me</h2>
          <p>
            I am a full stack developer from Fort Mill South Carolina. I develop
            websites using frameworks such as vue and react. I have experience
            working as a solo contractor for a local and as a member of a team
            of a nation wide staffing company. I am graduating from BYUI in
            April 2024 with a BS in Software Engineering and a certificate in
            Web Development. In my free time I enjoy mountain unicycling with my
            friends, and Camping in Lynnville NC. Feel free to check out my
            website below where you can learn more and view my full portfolio.
          </p>
          <!-- Add more information about yourself here -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showAboutMe: false,
    };
  },
};
</script>

<style scoped lang="scss">
#about-me-wrapper {
  text-align: center;
  transition: transform 0.3s ease-in-out;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 740px;
  width: 500px;
  cursor: pointer;
  perspective: 1000px; /* Add perspective for 3D effect */

  &:hover #about-me-inner {
    transform: rotateY(180deg);
  }

  h2 {
    font-size: 24px;
    color: #333;
  }

  p {
    font-size: 16px;
    color: #555;
    margin: 10px 0;
  }
}

#about-me-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.3s ease-in-out;
}

.profile-image-container {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backface-visibility: hidden;
}

.profile-image {
  width: 100%; /* Set the image width to 100% */
  max-height: 100%;
  transition: transform 0.3s ease-in-out;
  border-radius: 10px;
}

.text-content {
  background-color: #f2f2f2;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
  transform: rotateY(180deg); /* Rotate the text div when displayed */
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 7px;
}
</style>
