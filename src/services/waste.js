import api from './api';

export const wasteService = {
  async createWasteProject(projectData) {
    try {
      const response = await api.post('/waste-projects', projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur création projet' };
    }
  },

  async getAllWasteProjects() {
    try {
      const response = await api.get('/waste-projects');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur récupération projets' };
    }
  },

  async getWasteProjectsByEntrepreneur(entrepreneurId) {
    try {
      const response = await api.get(`/waste-projects?entrepreneur=${entrepreneurId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur récupération projets entrepreneur' };
    }
  },

  async updateWasteProject(projectId, updateData) {
    try {
      const response = await api.put(`/waste-projects/${projectId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur mise à jour projet' };
    }
  },

  async getWasteStats() {
    try {
      const response = await api.get('/waste-projects/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erreur récupération statistiques déchets' };
    }
  }
};