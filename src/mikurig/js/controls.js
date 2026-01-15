let usingOrtho = false;

function ToggleCamera(button) {
    usingOrtho = !usingOrtho;

    const cameraToUse = usingOrtho ? window.OrthographicCameraInstance : window.PerspectiveCameraInstance;
    window.ActiveCamera = cameraToUse;

    if (window.controls) {
        if (usingOrtho) {
            window.controls.object = window.OrthographicCameraInstance;
            window.controls.enableRotate = false;
            window.controls.enableZoom = true;
            window.controls.enablePan = true;
            window.controls.minZoom = 0.1;
            window.controls.maxZoom = 5;
        } else {
            window.controls.object = window.PerspectiveCameraInstance;
            window.controls.enableRotate = true;
            window.controls.enableZoom = true;
            window.controls.enablePan = true;
        }

        CenterCamera();

        window.controls.update();
    }

    ProcessButtons(button);
}

function CenterCamera() {
    const camera = window.ActiveCamera;
    const controls = window.controls;

    if (!camera || !controls) return;

    let bbox = null;

    if (window.CylinderObject) {
        // Vista individual
        bbox = new THREE.Box3().setFromObject(window.CylinderObject);
    } else if (window.sceneModels?.length > 0) {
        // Vista múltiple
        bbox = new THREE.Box3();

        window.sceneModels.forEach(model => {
            const modelBox = new THREE.Box3().setFromObject(model.group);
            bbox.union(modelBox);
        });
    } else {
        return;
    }

    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Determinar distancia segura basada en tamaño
    const distance = maxDim * 1.5;

    if (camera.isPerspectiveCamera) {
        camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    } else if (camera.isOrthographicCamera) {
        // Ajustar ortho frustum si es necesario
        camera.left = -maxDim;
        camera.right = maxDim;
        camera.top = maxDim;
        camera.bottom = -maxDim;
        camera.near = -distance;
        camera.far = distance * 3;
        camera.position.set(center.x, center.y, center.z + distance);
        camera.updateProjectionMatrix();
    }

    controls.target.copy(center);
    controls.update();

    if (usingOrtho) {
    UpdateOrthoFrustum(camera, center, maxDim);
    }
}

function UpdateOrthoFrustum(camera, center, size) {
    const aspect = window.renderer.domElement.clientWidth / window.renderer.domElement.clientHeight;

    const frustumHeight = size * 1.2; // un poco más para margen
    const frustumWidth = frustumHeight * aspect;

    camera.left = -frustumWidth / 2;
    camera.right = frustumWidth / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;

    camera.near = -size * 2;
    camera.far = size * 4;

    camera.position.set(center.x, center.y, center.z + size * 1.5);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
}

function SetCameraView(direction) {
    if (!window.sceneModels) return;

    window.sceneModels.forEach(model => {
        // Resetea rotación
        model.group.rotation.set(0, 0, 0);

        switch (direction) {
            case 'front':
                // rotación original
                break;
            case 'back':
                model.group.rotation.y = Math.PI;
                break;
            case 'side':
                model.group.rotation.y = Math.PI / 2;
                break;
            case 'right':
                model.group.rotation.y = -Math.PI / 2;
                break;
            case 'top':
                model.group.rotation.x = -Math.PI / 2;
                break;
            case 'bottom':
                model.group.rotation.x = Math.PI / 2;
                break;
        }
    });

    if (window.controls) {
        window.controls.update();
    }
}

function ProcessButtons(toggleButton){
    toggleButton = $(toggleButton);
    const icon = toggleButton.find('i');
    const textDiv = toggleButton.find('div');

    const iconString = usingOrtho ? 'bi-box-seam' : 'bi-box2';
    const textString = usingOrtho ? 'Cambiar a vista 3D' : 'Cambiar a vista 2D';

    icon.removeClass().addClass(`bi ${iconString}`);
    textDiv.text(textString);

    const viewButtons = $('.view-button');

    if(usingOrtho == false){
        viewButtons.addClass('visually-hidden');
    }
    else{
        viewButtons.removeClass('visually-hidden');
    }
}