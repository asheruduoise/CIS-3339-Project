<!-- Attendance bar chart (R5). The Chart.js instance is created on mount,
     updated when the props change, and destroyed on unmount (no leaks,
     no "Canvas is already in use" errors when navigating back). -->
<template>
  <div>
    <canvas ref="canvasRef" class="p-10" role="img" :aria-label="ariaLabel"></canvas>
  </div>
</template>

<script setup>
// ---- Composition API migration (F1): what changed from the Options API ----
// - props option -> defineProps()
// - this.$refs.attendanceChart -> const canvasRef = ref(null) template ref
// - async mounted() -> onMounted(render); new: watch(props) re-renders, onBeforeUnmount destroys the chart
// - (the Options version never destroyed the Chart.js instance -> leak/'canvas in use' errors)
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
  'Attendance chart: ' + props.label.map((l, i) => `${l}: ${props.chartData[i]}`).join(', ')
)

function render() {
  if (!canvasRef.value) return
  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: [...props.label],
      datasets: [{ borderWidth: 1, data: [...props.chartData], backgroundColor: 'rgba(200, 16, 46, 0.6)' }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Attendance Chart' }
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
