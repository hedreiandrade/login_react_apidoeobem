export const getInitialsImage = (name) => {
    if (!name || typeof name !== 'string') return '??'; // fallback padrão

    const initials = name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();

    // Aqui você pode retornar uma imagem gerada por texto ou uma URL com as iniciais
    return `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff&bold=true&size=128`;
};
