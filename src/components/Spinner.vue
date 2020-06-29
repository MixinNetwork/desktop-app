<template>
  <svg
    viewBox="0 0 38 38"
    xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    :stroke="color"
  >
    <g fill="none" fill-rule="evenodd">
      <g transform="translate(1 1)" stroke-width="2">
        <circle :stroke="stroke" cx="18" cy="18" r="18" />
        <g transform="translate(18 18)" v-show="loaded">
          <path :d="d">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
export default {
  name: 'spinner',
  props: {
    color: {
      type: String,
      default: '#000'
    },
    stroke: {
      type: String,
      default: 'transparent'
    },
    height: {
      type: Number,
      default: 64
    },
    width: {
      type: Number,
      default: 64
    },
    percent: {
      type: Number,
      default: 10
    }
  },
  data() {
    return {
      loaded: false
    }
  },
  mounted() {
    setTimeout(() => {
      this.loaded = true
    }, 50)
  },
  computed: {
    d() {
      const r = 18
      const percent = this.percent > 10 ? this.percent : 10
      const degrees = (percent / 100) * 360
      const rad = degrees * (Math.PI / 180)
      const x = (Math.sin(rad) * r).toFixed(2)
      const y = -(Math.cos(rad) * r).toFixed(2)
      const lenghty = window.Number(degrees > 180)
      const d = ['M', 0, -r, 'A', r, r, 0, lenghty, 1, x, y].join(' ')
      return d
    }
  }
}
</script>
