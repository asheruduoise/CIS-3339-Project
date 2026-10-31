<!-- Clients-by-zip donut chart (R5): create on mount, update on prop change,
     destroy on unmount. -->
<template>
  <div class="w-full md:w-1/2">
    <canvas ref="canvasRef" class="p-10" role="img" :aria-label="ariaLabel"></canvas>
  </div>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - props option -> defineProps()
// - this.$refs.zipChart -> const canvasRef = ref(null) template ref
// - async mounted() -> onMounted(render); new: watch(props) + onBeforeUnmount(chart.destroy())
// ---------------------------------------------------------------------------
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  label: { type: Array, default: () => [] },
  chartData: { type: Array, default: () => [] }
})

const canvasRef = ref(null)
let chart = null

const ariaLabel = computed(() =>
  'Clients by zip code: ' + props.label.map((l, i) => `${l}: ${props.chartData[i]}`).join(', ')
)

function render() {
  if (!canvasRef.value) return
  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: [...props.label],
      datasets: [{ borderWidth: 1, data: [...props.chartData] }]
    },
    options: {
      plugins: {
        legend: { display: true, position: 'bottom' },
        title: { display: true, text: 'Clients by Zip Code' }
      },
      responsive: true,
      maintainAspectRatio: true
    }
  })
}

onMounted(render)
watch(() => [props.label, props.chartData], render, { deep: true })
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>
