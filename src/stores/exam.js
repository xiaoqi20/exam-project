import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useExamStore = defineStore('exam', () => {
  const practicePaper = ref(null) // { title: '', questions: [] }

  function setPracticePaper(data) {
    practicePaper.value = data
  }

  return { practicePaper, setPracticePaper }
})