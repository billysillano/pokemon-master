import Vue from 'vue'
import Vuex from 'vuex'
import { setup } from 'axios-cache-adapter'

const api = setup({
  baseURL: 'https://pokeapi.co/api/v2',
  cache: {
    maxAge: 15 * 60 * 1000
  }
})

const imageSource = 'https://raw.github.com/billysillano/pokemon-assets/master/images'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    pokemonList: [],
    pokemonInfo: null,
    loading: false
  },

  mutations: {
    setPokemonInfo: (state, payload) => {
      state.pokemonInfo = payload
    },

    setPokemonList: (state, payload) => {
      state.pokemonList = [...state.pokemonList, ...payload]
    },

    setLoading: (state, payload) => {
      state.loading = payload
    }
  },

  actions: {
    /* eslint-disable camelcase */
    getPokemon: async ({ commit }, payload) => {
      commit('setLoading', true)
      let pokemon = null

      try {
        const res = await api.get(`/pokemon-species/${payload}`)

        if (res.status === 200 && res.data) {
          pokemon = {}
          const { id, name, names, genera, flavor_text_entries, color, varieties, evolution_chain } = res.data

          pokemon.id = id
          pokemon.name = name
          pokemon.jname = names.filter(i => i.language.name === 'ja')[0] || pokemon.name
          pokemon.genera = genera.filter(i => i.language.name === 'en')[0] || ''
          pokemon.description = flavor_text_entries
            .filter(i => i.language.name === 'en')
            .map(i => i.flavor_text.replace(/\s|\r?\n|\r/g, ' '))
            .filter((value, index, self) => {
              return self.indexOf(value) === index
            })

          pokemon.color = color.name === 'white' ? '#ddd' : color.name
          pokemon.varieties = varieties
          pokemon.data = []
          pokemon.defaultImage = `${imageSource}/${pokemon.id}.png`

          if (pokemon.id === 25) pokemon.varieties.splice(6)// pikachu

          for (const variety of pokemon.varieties) {
            const res = await api.get(`/pokemon/${variety.pokemon.name}`)
            if (res.status === 200) {
              let { name, height, weight, types, abilities, stats, forms } = res.data

              const images = []

              if (pokemon.id === 493 || pokemon.id === 773) { // for arceus and silvally
                images.push({ formName: '', image: `${imageSource}/${pokemon.id}.png` })
              } else {
                for (const form of forms.reverse()) {
                  const formName = form.name.replace(pokemon.name, '')
                  const image = `${imageSource}/${pokemon.id}${formName}.png`
                  images.push({ formName, image })
                }
              }

              weight = `${(Number(weight) / 10).toFixed(2)} kg`
              height = `${(Number(height) * 10).toFixed(2)} cm`
              stats.reverse()
              const totalStats = stats.reduce((acc, cur) => acc + cur.base_stat, 0)
              const highestStat = stats.reduce((acc, cur) => Math.max(acc, cur.base_stat), 0)
              abilities = abilities.reverse().map(i => i.ability.name).join(', ')
              pokemon.data.push({ name, height, weight, types, abilities, stats, images, totalStats, highestStat })
            }
          }

          // evolution
          pokemon.evo = []

          const evo = await api.get(evolution_chain.url)
          if (evo.status === 200 && evo.data && evo.data.chain) {
            pokemon.evo = evo.data.chain
          }
        }
      } catch (e) {
        console.error('Pokemon Not Found.', e)
      } finally {
        commit('setPokemonInfo', pokemon)
        commit('setLoading', false)
      }
    },

    getPokemonList: async ({ commit, state }) => {
      if (state.pokemonList.length >= 807) return

      commit('setLoading', true)
      try {
        const offset = state.pokemonList.length
        const res = await api.get(`/pokemon-species/?offset=${offset}&limit=${30}`)
        if (res.status === 200 && res.data && res.data.results) {
          const list = res.data.results.map((i, index) => {
            i.image = `${imageSource}/${offset + index + 1}.png`
            return i
          })
          commit('setPokemonList', list)
        }
      } catch {
        console.error('Failed to load pokemon list.')
      } finally {
        commit('setLoading', false)
      }
    }
  }
})
