<template>
  <div class="card">
    <div class="card-content">
      <h2 class="card-title">About Me</h2>
      <p>
        I am a full stack developer from Fort Mill South Carolina. I develop
        websites using frameworks such as vue and react. I have experience
        working as a solo contractor for a local business and as a member of a
        team of a nation wide staffing company. I am graduating from BYUI in
        April 2024 with a BS in Software Engineering and a certificate in Web
        Development. In my free time I enjoy mountain unicycling with my
        friends, and Camping in Lynville NC. Feel free to check out my website
        below where you can learn more and view my full portfolio.
      </p>
      <a href="skylersimpson1-9-24.pdf" target="_blank" class="view-pdf-button">
        My Resume
      </a>
    </div>
  </div>
</template>

<script>
export default {
  data() {},
};
</script>

<style scoped lang="scss">
:root {
  --clr-blk: black;
  --clr-wht: white;
  --clr-accent: rgb(70, 111, 188);
}

.card {
  color: white;
  background-image: url(../assets/photos/skylersimpson.jpg);
  background-size: cover;
  padding: 35rem 0 0;
  max-width: 80ch;
  overflow: hidden;
}
.card-content {
  font-size: larger;
  font-family: 'century Gothic', 'Arial Narrow', Arial, sans-serif;
  font-weight: 100;
  --padding: 1.5rem;
  padding: var(--padding);
  background: linear-gradient(
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.5) 20%,
    rgba(0, 0, 0, 1)
  );
}

.card-title {
  padding-left: 15px;
  font-size: xx-large;
  position: relative;
  width: max-content;
}

.card-title::after {
  content: '';
  position: absolute;
  height: 4px;
  left: calc(var(--padding) * -1);
  bottom: -4px;
  width: calc(100% + var(--padding));
  background: #00b4d8;
}

.view-pdf-button {
  display: inline-block;
  padding: 8px 15px;
  background-color: #00b4d8; /* Adjust the background color */
  color: #fff; /* Adjust the text color */
  text-decoration: none;
  border-radius: 5px;
  font-size: 17px;
  margin-top: 5px;
}
.view-pdf-button:hover {
  background-color: #00c4eb; /* Adjust the hover background color */
}
@media (hover: hover) {
  .card-content {
    transform: translateY(77%);
    transition: transform 500ms ease;
  }
  .card-title::after {
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 500ms ease;
  }
  .card-content > * :not(.card-title) {
    opacity: 0;
    transition: opacity 500ms ease;
  }
  .card:hover .card-content > * :not(.card-title) {
    opacity: 1;
  }
  .card:hover .card-content {
    transform: translateY(0);
  }
  .card:hover .card-title::after {
    transform: scaleX(1);
    transition-delay: 500ms;
  }
}
@media screen and (max-width: 480px) {
  .card {
    color: white;
    background-image: url(../assets/photos/skylersimpson.jpg);
    background-size: cover;
    background-position-x: -55px;
    padding: 14rem 0 0;
    max-width: 80ch;
    overflow: hidden;
  }
  .card-content {
    font-size: medium;
    font-weight: 100;
    --padding: 1.5rem;
    padding: var(--padding);
  }
}
</style>
