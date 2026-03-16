const fs = require('fs-extra');
const path = require('path');

const resourcesSource = path.resolve(__dirname, '..', 'src', 'resources');
const resourcesTarget = path.resolve(__dirname, '..', 'dist', 'resources');

if (fs.existsSync(resourcesSource)) {
	fs.copySync(resourcesSource, resourcesTarget, { overwrite: true });
}

const schemasSource = path.resolve(__dirname, '..', 'src', 'schemas');
const schemasTarget = path.resolve(__dirname, '..', 'dist', 'schemas');

if (fs.existsSync(schemasSource)) {
	fs.copySync(schemasSource, schemasTarget, { overwrite: true });
}
