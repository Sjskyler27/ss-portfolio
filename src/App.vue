<template>
  <div id="app">
    <div id="centered-container">
      <h1>Skyler Simpsons Portfolio</h1>
      <AboutMe></AboutMe>
      <h1>My Projects</h1>
      <ProjectComponent
        title="Itch Programming for Kids!"
        description="Itch is a programming website aimed to help children transition from block coding like scratch to coding with languages like python and VB. Me and my team had 24 hours to complete this website as part of a BYUI hackathon. We created our website using Vue, HTML, CSS, Javascript, and netlify. We are very happy with our accomplishments and we were even awarded third place."
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
        description="I had the opportunity to work as a contractor for stonecrest suites as a solo full stack developer. They had recently acquired another office building for there lawfirm and had extra rooms that they were renting out to businesses. This was all being done through 
        word of mouth. I was able to step in and create a website for them that allowed users to create an account and reserve conference and office rooms. The website that I created is scaleable allowing admins to add locations, rooms, edit reservations etc. They are also able to edit the appearance of their website along with any pertinent information"
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
        title="Plums!"
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
        title="CodeNames"
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
        title="Holidea"
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
