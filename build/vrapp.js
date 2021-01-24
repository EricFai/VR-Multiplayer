// Option 1: Import the entire three.js core library.
import * as THREE from './_snowpack/pkg/three.js';
import { BoxBufferGeometry, Mesh, MeshPhongMaterial } from './_snowpack/pkg/three.js';

import { BoxLineGeometry } from './_snowpack/pkg/three/examples/jsm/geometries/BoxLineGeometry.js';
import { VRButton } from './_snowpack/pkg/three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from './_snowpack/pkg/three/examples/jsm/webxr/XRControllerModelFactory.js';

const DB = firebase.database();

let user;

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

const otherPlayers = {};

let room;

let testCube;

function init() {
    user = firebase.auth().currentUser;

    const userref = DB.ref(`users/${user.uid}`);
    userref.update({ status: "online" })
    userref.onDisconnect().remove();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);

    room = new THREE.LineSegments(
        new BoxLineGeometry(10, 10, 10, 10, 10, 10),
        new THREE.LineBasicMaterial({ color: 0x808080 })
    );
    room.geometry.translate(0, 3, 0);
    scene.add(room);

    scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    testCube = new Mesh(new BoxBufferGeometry(), new MeshPhongMaterial({ color: 0xffcc00 }));
    testCube.position.z = -2
    scene.add(testCube);
    window.testCube = testCube;

    const testRef = DB.ref('test');
    testRef.on('value', (snapshot) => {
        const data = snapshot.val();
        testCube.position.x = data.x;
        testCube.position.y = data.y;
        testCube.position.z = data.z;
    })

    //

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    //

    document.body.appendChild(VRButton.createButton(renderer));

    // controllers

    function onSelectStart() {

        this.userData.isSelecting = true;

    }

    function onSelectEnd() {

        this.userData.isSelecting = false;

    }

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('connected', function (event) {

        this.add(buildController(event.data));

    });
    controller1.addEventListener('disconnected', function () {

        this.remove(this.children[0]);

    });
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    controller2.addEventListener('connected', function (event) {

        this.add(buildController(event.data));

    });
    controller2.addEventListener('disconnected', function () {

        this.remove(this.children[0]);

    });
    scene.add(controller2);

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    //

    window.addEventListener('resize', onWindowResize, false);

    //handle other players
    const usersListRef = firebase.database().ref("users");

    usersListRef.on("child_added", (data) => {
        //don't need to render the mesh of the current user, only of other users
        if (data.key == user.uid) return;

        const playerData = data.val;

        const material = new MeshPhongMaterial({ color: 0xffffff });

        const headMesh = new Mesh(new BoxBufferGeometry(0.1, 0.1, 0.1), material);
        headMesh.position.x = playerData.head.x;
        headMesh.position.y = playerData.head.y;
        headMesh.position.z = playerData.head.z;

        scene.add(headMesh);

        const hand1mesh = new Mesh(new BoxBufferGeometry(0.05, 0.05, 0.05), material);
        hand1mesh.visible = playerData.hands[0].visible;
        hand1mesh.position.x = playerData.hands[0].x;
        hand1mesh.position.y = playerData.hands[0].y;
        hand1mesh.position.z = playerData.hands[0].z;

        scene.add(hand1mesh);


        const hand2mesh = new Mesh(new BoxBufferGeometry(0.05, 0.05, 0.05), material);
        hand2mesh.visible = playerData.hands[1].visible;
        hand2mesh.position.x = playerData.hands[1].x;
        hand2mesh.position.y = playerData.hands[1].y;
        hand2mesh.position.z = playerData.hands[1].z;

        scene.add(hand2mesh);

        otherPlayers[data.key] = {
            headMesh,
            hand1mesh,
            hand2mesh
        };
    });

    usersListRef.on("child_changed", (data) => {
        //don't need to render the mesh of the current user, only of other users
        if (data.key == user.uid) return;

        const playerData = data.val;
        otherPlayers[data.key].headMesh.position.x = playerData.head.x;
        otherPlayers[data.key].headMesh.position.y = playerData.head.y;
        otherPlayers[data.key].headMesh.position.z = playerData.head.z;

        otherPlayers[data.key].hand1mesh.visible = playerData.hands[0].visible;
        otherPlayers[data.key].hand1mesh.position.x = playerData.hands[0].x;
        otherPlayers[data.key].hand1mesh.position.y = playerData.hands[0].y;
        otherPlayers[data.key].hand1mesh.position.z = playerData.hands[0].z;

        otherPlayers[data.key].hand2mesh.visible = playerData.hands[1].visible;
        otherPlayers[data.key].hand2mesh.position.x = playerData.hands[1].x;
        otherPlayers[data.key].hand2mesh.position.y = playerData.hands[1].y;
        otherPlayers[data.key].hand2mesh.position.z = playerData.hands[1].z;

        otherPlayers[data.key] = {
            headMesh,
            hand1mesh,
            hand2mesh
        };
    });

    usersListRef.on("child_removed", (data) => {
        //don't need to render the mesh of the current user, only of other users
        if (data.key == user.uid) return;

        scene.remove(otherPlayers[data.key].headMesh);
        scene.remove(otherPlayers[data.key].hand1mesh);
        scene.remove(otherPlayers[data.key].hand2mesh);

        delete otherPlayers[data.key];
    });
}

function buildController(data) {

    let geometry, material;

    switch (data.targetRayMode) {

        case 'tracked-pointer':

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

            material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

            return new THREE.Line(geometry, material);

        case 'gaze':

            geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
            material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
            return new THREE.Mesh(geometry, material);

    }

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function handleController(controller) {

    if (controller.userData.isSelecting) {

    }

}

//

export function StartVRApp() {
    init();
    renderer.setAnimationLoop(render);

}

function updateUserPos() {
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(camera.matrixWorld);

    const userref = DB.ref(`users/${user.uid}`);
    userref.update({
        head: {
            x: position.x,
            y: position.y,
            z: position.z,
            visible: true,
        },
        hands: [
            {
                x: controller1.position.x,
                y: controller1.position.y,
                z: controller1.position.z,
                visible: controller1.visible
            },
            {
                x: controller2.position.x,
                y: controller2.position.y,
                z: controller2.position.z,
                visible: controller2.visible
            }
        ]
    })
}

function render() {
    updateUserPos();
    handleController(controller1);
    handleController(controller2);

    renderer.render(scene, camera);

}