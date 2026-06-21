export const getLocalIP = async () => {
  try {
    // En développement, vous pouvez hardcoder ou détecter
    return '192.168.1.114'; // À mettre à jour manuellement
  } catch (error) {
    return '192.168.1.114'; // Fallback
  }
};