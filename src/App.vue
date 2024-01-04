<template>
  <div id="app">
    <div id="centered-container">
      <h1>Skyler Simpsons Portfolio</h1>
      <AboutMe></AboutMe>
      <ProjectComponent
        title="Itch Programming for Kids!"
        timeframe="24 hours"
        description="This is a detailed description of the project."
        image="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
        :images="[
          'https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png',
          'https://i.ibb.co/PQGMGZv/image.png',
          'https://i.ibb.co/YTL8WB3/image.png',
        ]"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
          { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
          { name: 'Devpost submission', url: 'https://example.com' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="StoneCrest Suites"
        timeframe="100 hours"
        description="This is a detailed description of the project."
        :images="[
          'https://i.ibb.co/7zZ23JW/image.png',
          'https://i.ibb.co/Cm5Dm9t/image.png',
          'https://i.ibb.co/6BBSyMC/image.png',
          'https://i.ibb.co/bvNBrJk/image.png',
        ]"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
          { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
          { name: 'Devpost submission', url: 'https://example.com' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="Itch Programming for Kids!"
        timeframe="24 hours"
        description="This is a detailed description of the project."
        image="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
          { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
          { name: 'Devpost submission', url: 'https://example.com' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="Itch Programming for Kids!"
        timeframe="24 hours"
        description="This is a detailed description of the project."
        images="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
          { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
          { name: 'Devpost submission', url: 'https://example.com' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="Itch Programming for Kids!"
        timeframe="24 hours"
        description="This is a detailed description of the project."
        image="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
          { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
          { name: 'Devpost submission', url: 'https://example.com' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
    </div>
  </div>
</template>

<script>
import AboutMe from './components/AboutMe.vue'; // Import AboutMe

export default {
  components: {
    AboutMe, // Register AboutMe as a child component
  },
  // Other properties and methods of your parent component
};
</script>

<style lang="scss">
#centered-container {
  display: flex;
  flex-direction: column; /* Stack items vertically */
  align-items: center; /* Center items horizontally */
  justify-content: center; /* Center items vertically */
}

::-webkit-scrollbar {
  width: 8px; /* Set the scrollbar width */
  height: 8px; /* Set the scrollbar height */
}

::-webkit-scrollbar-thumb {
  background-color: #5a7c8e; /* Set the thumb color */
  border-radius: 4px; /* Round the thumb edges */
}

::-webkit-scrollbar-track {
  background-color: #e5e5e5; /* Set the track color */
  border-radius: 4px; /* Round the track edges */
}
</style>
