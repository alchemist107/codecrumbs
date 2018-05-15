const directoryTree = require('directory-tree');
const codecrumbs = require('./codecrumbs/codecrumbs');
const file = require('./utils/file');
const madge = require('madge');
const chokidar = require('chokidar');
const debounce = require('lodash.debounce');

const getDirFiles = projectDir => {
    const filesList = [];

    const filesTree = directoryTree(
        projectDir,
        { extensions: /\.jsx?$/ },
        (item, PATH) => {
            filesList.push(item);
        }
    );

    return { list: filesList, tree: filesTree };
};

const getDependenciesList = (projectDir, entryPoint) => {
    return madge(projectDir + entryPoint).then(res => res.obj());
};

const grabProjectSourceState = (projectDir, entryPoint) => {
    const dirFiles = getDirFiles(projectDir);

    return Promise.all([
        getDependenciesList(projectDir, entryPoint),
        ...dirFiles.list.map(item =>
            file.read(item.path, 'utf8').then(code => {
                const codecrumbsList = codecrumbs.getCrumbs(code);

                item.codecrumbs = codecrumbsList;
                item.hasCodecrumbs = !!codecrumbsList.length;
            })
        )
    ]).then(([dependenciesList]) => ({
        filesTree: dirFiles.tree,
        filesList: dirFiles.list,
        dependenciesList
    }));
};

const createWatcher = (dir, fn) => {
    const DELAY = 500;

    const watcher = chokidar.watch(dir);
    watcher.on('all', debounce(fn, DELAY));

    return watcher;
};

const subscribeOnChange = (projectDir, entryPoint, fn) => {
    //use watcher.close(); to stop watching
    return createWatcher(projectDir, () => {
        console.log('Update project source state...');
        //TODO: add more specific handling, to re-draw only changed files
        grabProjectSourceState(projectDir, entryPoint).then(fn);
    });
};

module.exports = {
    subscribeOnChange
};