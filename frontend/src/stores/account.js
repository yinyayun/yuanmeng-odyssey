import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'

export const useAccountStore = defineStore('account', () => {
  const account = ref(null)
  const transactions = ref([])
  const rules = ref([])
  const stats = ref(null)

  const currentBalance = computed(() => account.value?.balance || 0)

  const fetchAccount = async () => {
    const data = await request.get('/account')
    account.value = data
    return data
  }

  const fetchRules = async () => {
    const data = await request.get('/rules')
    rules.value = data
    return data
  }

  const createAccount = async (name) => {
    const data = await request.post('/account', { name })
    account.value = data
    return data
  }

  const saveRule = async (rule) => {
    const data = await request.post('/rules', rule)
    await fetchRules()
    return data
  }

  const deleteRule = async (id) => {
    await request.delete(`/rules/${id}`)
    await fetchRules()
  }

  const deposit = async (transaction) => {
    const data = await request.post('/transactions/deposit', transaction)
    await fetchAccount()
    return data
  }

  const withdraw = async (transaction) => {
    const data = await request.post('/transactions/withdraw', transaction)
    await fetchAccount()
    return data
  }

  const fetchTransactions = async (params = {}) => {
    const data = await request.get('/transactions', { params })
    transactions.value = data
    return data
  }

  const fetchStats = async (params = {}) => {
    const data = await request.get('/account/stats', { params })
    stats.value = data
    return data
  }

  return {
    account,
    transactions,
    rules,
    stats,
    currentBalance,
    fetchAccount,
    fetchRules,
    createAccount,
    saveRule,
    deleteRule,
    deposit,
    withdraw,
    fetchTransactions,
    fetchStats
  }
})
