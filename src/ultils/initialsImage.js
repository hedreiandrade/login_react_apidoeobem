export const getInitialsImage = (name) => {
    const initials = name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff&bold=true&size=128`;
}
