import {
    Scene,
    AxesHelper,
    GridHelper,
    AmbientLight,
    PlaneGeometry,
    BufferGeometry,
    LineBasicMaterial,
    MeshBasicMaterial,
    MeshPhongMaterial,
    Mesh,
    BufferAttribute,
    Vector3,
    Ray,
    Plane,
    Frustum,
    Color
} from 'three';
import { DoubleSide } from 'three';
import { FontLoader } from 'three-loaders/FontLoader.js';

import { camerasTypes, units } from '../data.js';
import { Checkerboard } from './Checkerboard.js';
import { SceneObjects } from './objects/SceneObjects.js';
import { Node } from './objects/sensors/Node.js';

//DEBUG
import { SphereGeometry } from 'three';

class SceneManager{
    static loadFont(callback)
    {
        new FontLoader().load( 'fonts/helvetiker_regular.typeface.json', function ( response ) {
            SceneManager.font = response;
            callback();
            return;
        });
    }
    static font;
    static DEFAULT_UNIT = units.meters;
    static DEFAULT_WIDTH = 5;
    static DEFAULT_HEIGHT = 5;

    static TABLE_ELEVATION = 0.75;
    static HAND_TRACKING_OVERLAP_HEIGHT = 0.25;

    constructor(_transformControl)
    {
        this.scene = buildScene();

        this.currentUnit = SceneManager.DEFAULT_UNIT;

        this.sceneWidth = SceneManager.DEFAULT_WIDTH;
        this.sceneHeight = SceneManager.DEFAULT_HEIGHT;
        this.sceneElevation = 0;

        this.size = 160;

        this.wallXDepth = - 10;
        this.wallZDepth = - 10;

        const floorNormal = new Vector3(0,1,0);
        const wallXNormal = new Vector3(1,0,0);
        const wallZNormal = new Vector3(0,0,1);

        this.checkerboard;
        this.objects = new SceneObjects(_transformControl, this);;

        this.augmentaSceneLoaded = false;

        //DEBUG
        const spheres = [];
        const rays = [];
    

    /* SCENE INITIALISATION */

        this.initScene = function()
        {
            // Lighting
            const ambient = new AmbientLight( 0xffffff, 0.5 );
            this.scene.add(ambient);

            // Floor
            const floor = buildFloorMesh(this.size, this.wallXDepth, this.wallZDepth);
            this.scene.add(floor);

            // WallX
            const wallX = buildWallXMesh(this.size, this.wallXDepth, this.wallZDepth);
            this.scene.add(wallX);
        
            // WallZ
            const wallZ = buildWallZMesh(this.size, this.wallZDepth, this.wallXDepth);
            this.scene.add(wallZ);

            //Origin
            const axesHelper = buildAxesHelper();
            this.scene.add(axesHelper);

            // Grid Helper
            const gridHelper = buildGridHelper();
            this.scene.add(gridHelper);
        }

        this.initAugmentaScene = function()
        {
            // Scene Checkerboard
            this.checkerboard = new Checkerboard(this.currentUnit, this.sceneElevation, this.sceneWidth, this.sceneHeight);
            this.checkerboard.addPlanesToScene(this.scene);

            this.augmentaSceneLoaded = true;

            //SceneObjects
            this.objects.initObjects();
        }

    /* BUILDERS */
        function buildScene()
        {
            const scene = new Scene();
            scene.background = new Color(0x222222);

            return scene;
        }

        function buildFloorMesh(size, wallXDepth, wallZDepth)
        {
            const materialFloor = new MeshPhongMaterial( {side:DoubleSide, color: 0x555555});
            
            const geometryFloor = new PlaneGeometry( size + 0.02, size + 0.02 );

            const floor = new Mesh(geometryFloor, materialFloor);
            floor.position.set( size / 2.0 + wallXDepth, - 0.01, size / 2.0 + wallZDepth ); //to avoid z-fight with area covered by cam (y = sceneElevation for area covered)
            floor.rotation.x = - Math.PI / 2.0;

            return floor;
        }

        function buildWallXMesh(size, wallXDepth, wallZDepth)
        {
            const materialWallX = new MeshPhongMaterial( {color: 0xCCCCCC});//{ color: 0x522B47, dithering: true } ); // violet
        
            const geometryWallX = new PlaneGeometry( size + 0.02, size + 0.02 );
        
            const wallX = new Mesh(geometryWallX, materialWallX);
            wallX.position.set(wallXDepth - 0.01, size / 2.0, size / 2.0 + wallZDepth); //to avoid z-fight with area covered by cam (y = 0 for area covered)
            wallX.rotation.y = Math.PI / 2.0;

            return wallX;
        }

        function buildWallZMesh(size, wallZDepth, wallXDepth)
        {
            const materialWallZ = new MeshPhongMaterial( {color: 0xAAAAAA});//{ color: 0x7B0828, dithering: true } ); // magenta
        
            const geometryWallZ = new PlaneGeometry( size + 0.02, size + 0.02 );
        
            const wallZ = new Mesh(geometryWallZ, materialWallZ);
            wallZ.position.set(size / 2.0 + wallXDepth, size/2.0, wallZDepth - 0.01); //to avoid z-fight with area covered by cam (y = 0 for area covered)
            
            return wallZ;
        }

        function buildAxesHelper()
        {
            const axesHelper = new AxesHelper( 0.5 );
            axesHelper.position.set(-0.01,0,-0.01);

            axesHelper.material = new LineBasicMaterial( {
                color: 0xffffff,
                linewidth: 3});

            return axesHelper;
        }

        function buildGridHelper()
        {
            const gridHelper = new GridHelper( 2000, 2000, 0x444444, 0x444444 );
            gridHelper.position.y = -0.001

            return gridHelper;
        }

    /* USER'S ACTIONS */

        this.toggleUnit = function()
        {
            const unit = this.currentUnit === units.meters ? units.feets : units.meters;

            if(this.augmentaSceneLoaded) this.checkerboard.toggleUnit(unit);
            const unitNumberElements = document.querySelectorAll('[data-unit]');
            unitNumberElements.forEach(e => {
                if(e.tagName === 'INPUT') e.value = Math.round(e.value / this.currentUnit.value * unit.value * 100) / 100.0;
                else e.innerHTML = Math.round(e.innerHTML / this.currentUnit.value * unit.value * 100) / 100.0;
                e.dataset.unit = unit.value;
            });
            const unitCharElements = document.querySelectorAll('[data-unittext]');
            unitCharElements.forEach(e => {
                e.dataset.unittext = unit.value;
                e.innerHTML = unit.label;
            });

            document.getElementById('toggle-unit-button-' + this.currentUnit.label).classList.remove("bold-font");
            document.getElementById('toggle-unit-button-' + this.currentUnit.label).classList.add("normal-font");
            document.getElementById('toggle-unit-button-' + unit.label).classList.remove("normal-font");
            document.getElementById('toggle-unit-button-' + unit.label).classList.add("bold-font");
            
            this.currentUnit = unit;
        }

        /**
         * Define the border of the scene to track
         * 
         * @param {*} givenWidthValue horizontal length value entered input in the current unit.
         * @param {*} givenHeightValue vertical length value entered input in the current unit.
         */
        this.updateAugmentaSceneBorder = function(givenWidthValue, givenHeightValue)
        {
            if(givenWidthValue && givenHeightValue)
            {
                const givenWidth = parseFloat(givenWidthValue) / this.currentUnit.value;
                const givenHeight = parseFloat(givenHeightValue) / this.currentUnit.value;

                this.sceneWidth = givenWidth;
                this.sceneHeight = givenHeight;

                //update checkerboard
                if(this.augmentaSceneLoaded) this.checkerboard.setSize(givenWidth, givenHeight);

                this.objects.calculateScenePolygon(givenWidth, givenHeight);
            }
        }


        /* SCENE UPDATE */

        /* NOES PROJECTION */ 

        /**
         * Calculate area covered by the node to draw it and display it
         * 
         * @param {Node} node the node to draw the projection 
         */
        this.drawProjection = function(node)
        {
            //TODO: Comment ++

            /** GLOBAL OPERATING PHILOSPHY
             * 
             * 1/ remove all drawn projections
             * 2/ for each plane of the scene (floor, walls ...), calculates the intersection rays
             * 3/ for each plane of the scene, calculates the intersection points of those rays
             * 4/ keeps only points into the frustum of the camera cam
             * 5/ calculate area covered by the camera and display it
             * 6/ draw surfaces covered using its vertices (points previously calculated)
             */
            
            this.scene.remove(node.areaCoveredFloor);
            this.scene.remove(node.areaCoveredWallX);
            this.scene.remove(node.areaCoveredWallZ);

            const floorPlane = new Plane(floorNormal, -this.sceneElevation);
            const wallXPlane = new Plane(wallXNormal, -this.wallXDepth);
            const wallZPlane = new Plane(wallZNormal, -this.wallZDepth);

            if(node.areaAppear)
            {
                const floorRays = [];
                const wallXRays = [];
                const wallZRays = [];

                const frustum = new Frustum();
                frustum.setFromProjectionMatrix(node.cameraPerspective.projectionMatrix);
                //calculate the rays representing the intersection between frustum's planes and the floor or the walls
                for(let i = 0; i < 6; i++) 
                {
                    const plane = frustum.planes[i].applyMatrix4(node.cameraPerspective.matrixWorld);

                    //crossing the floor
                    const rayIntersectFloor = getIntersectionOfPlanes(plane, floorPlane);
                    if(rayIntersectFloor !== -1) floorRays.push(rayIntersectFloor);

                    //crossing the left wall
                    const rayIntersectWallX = getIntersectionOfPlanes(plane, wallXPlane);
                    if(rayIntersectWallX !== -1) wallXRays.push(rayIntersectWallX);

                    //crossing the far wall
                    const rayIntersectWallZ = getIntersectionOfPlanes(plane, wallZPlane);
                    if(rayIntersectWallZ !== -1) wallZRays.push(rayIntersectWallZ);
                }

                //adding rays for walls intersections
                const floorWallXRay = getIntersectionOfPlanes(floorPlane, wallXPlane);
                const wallXWallZRay = getIntersectionOfPlanes(wallXPlane, wallZPlane);
                const floorWallZRay = getIntersectionOfPlanes(floorPlane, wallZPlane);

                if(floorWallXRay !== -1) 
                {
                    floorRays.push(floorWallXRay);
                    wallXRays.push(floorWallXRay);
                }
                if(wallXWallZRay !== -1)
                {
                    wallXRays.push(wallXWallZRay);
                    wallZRays.push(wallXWallZRay);
                }
                if(floorWallZRay !== -1)
                {
                    floorRays.push(floorWallZRay);
                    wallZRays.push(floorWallZRay);
                }
                
                
                //get intersection points
                const intersectionPointsFloor = getIntersectionPoints(floorRays);
                const intersectionPointsWallX = getIntersectionPoints(wallXRays);
                const intersectionPointsWallZ = getIntersectionPoints(wallZRays);


                //filter points in the camera frustum
                const frustumScaled = new Frustum();
                frustumScaled.setFromProjectionMatrix(node.cameraPerspective.projectionMatrix);

                for(let i = 0; i < 6; i++) 
                {
                    frustumScaled.planes[i].applyMatrix4(node.cameraPerspective.matrixWorld);
                    frustumScaled.planes[i].constant += 0.01;
                }

                const coveredPointsFloor = intersectionPointsFloor.filter(p => frustumScaled.containsPoint(p) && p.x > this.wallXDepth - 0.01 && p.y > this.sceneElevation - 0.01 && p.z > this.wallZDepth - 0.01);
                const coveredPointsWallX = intersectionPointsWallX.filter(p => frustumScaled.containsPoint(p) && p.x > this.wallXDepth - 0.01 && p.y > this.sceneElevation - 0.01 && p.z > this.wallZDepth - 0.01);
                const coveredPointsWallZ = intersectionPointsWallZ.filter(p => frustumScaled.containsPoint(p) && p.x > this.wallXDepth - 0.01 && p.y > this.sceneElevation - 0.01 && p.z > this.wallZDepth - 0.01);

                sortByAngle(coveredPointsFloor, floorNormal);
                sortByAngle(coveredPointsWallX, wallXNormal);
                sortByAngle(coveredPointsWallZ, wallZNormal);

                coveredPointsFloor.forEach((p) => p.y += 0.01*node.id / this.objects.getNbNodes());
                coveredPointsWallX.forEach((p) => p.x += 0.01*node.id / this.objects.getNbNodes());
                coveredPointsWallZ.forEach((p) => p.z += 0.01*node.id / this.objects.getNbNodes());

                node.coveredPointsAbove = coveredPointsFloor;

                //display area value 
                const previousValue = node.areaValue;
                node.areaValue = calculateArea(coveredPointsFloor, this.currentUnit.value);

                //Place text 
                if(coveredPointsFloor.length > 2)
                {
                    //cam.nameText.geometry = new TextGeometry( "Cam " + (cam.id+1), { font: font, size: cam.areaValue / 40.0, height: 0.01 } );
                    const barycentre = getBarycentre(coveredPointsFloor);
                    node.changeTextPosition(barycentre, this.currentUnit.value);
                    if(previousValue != node.areaValue) node.updateAreaText(this.currentUnit);
                }
                else
                {
                    //console.log(node.nameText);
                    //node.nameText.position.copy(node.cameraPerspective.position);
                    node.changeTextPosition(node.cameraPerspective.position.clone(), this.currentUnit.value);
                    node.nameText.scale.set(Node.SIZE_TEXT_NODE / 1.7 / node.nameText.geometry.parameters.options.size, Node.SIZE_TEXT_NODE / 1.7 / node.nameText.geometry.parameters.options.size, 1);
                    node.areaValueText.visible = false;
                }

                //draw area

                node.areaCoveredFloor.geometry.dispose();
                node.areaCoveredFloor.material.dispose();
                node.areaCoveredWallX.geometry.dispose();
                node.areaCoveredWallX.material.dispose();
                node.areaCoveredWallZ.geometry.dispose();
                node.areaCoveredWallZ.material.dispose();

                node.areaCoveredFloor = drawAreaWithPoints(coveredPointsFloor);
                node.areaCoveredWallX = drawAreaWithPoints(coveredPointsWallX);
                node.areaCoveredWallZ = drawAreaWithPoints(coveredPointsWallZ);

                this.scene.add(node.areaCoveredFloor);
                this.scene.add(node.areaCoveredWallX);
                this.scene.add(node.areaCoveredWallZ);
            }

            //DEBUG SPHERES
            /*
            for(let i = 0; i < spheres.length; i++)
            {
                spheres[i].geometry.dispose();
                spheres[i].material.dispose();
                this.scene.remove(spheres[i]);
            }
            for(let i = 0; i < intersectionPointsAbove.length; i++)
            {
                const geometry = new SphereGeometry( 0.4, 32, 16 );
                const material = new MeshBasicMaterial({ color: 0x00ff22 });
                const sphere = new Mesh( geometry, material );
                this.scene.add( sphere );
                sphere.translateOnAxis(intersectionPointsAbove[i],1);
                spheres.push(sphere);
            }
            */
            //FIN DEBUG

            //DEBUG RAYS
            /*
            for(let i = 0; i < rays.length; i++)
            {
                rays[i].geometry.dispose();
                rays[i].material.dispose();
                scene.remove(rays[i]);
            }
            for(let i = 0; i < aboveRays.length; i++)
            {
                for(let t = -2; t < 5; t++)
                {
                    const geometry = new BoxGeometry( 0.6, 0.6, 0.6 );
                    const material = new MeshBasicMaterial(t < 3.9 ? { color: 0xffffff } : { color: 0xffff00 } );
                    const cube = new Mesh( geometry, material );
                    scene.add( cube );
                    const translation = new Vector3();
                    aboveRays[i].at(t, translation);
                    cube.translateOnAxis(translation, 1);
                    rays.push(cube);
                }
            }
            */
            //FIN DEBUG
        }

        /**
         * Get every intersection points of multiple rays
         * 
         * @param {Array} raysCrossing an array filled with Ray objects
         * @returns {Array} an array of points which are all the intersection poins of the rays in raysCrossing array
         */
        function getIntersectionPoints(raysCrossing)
        {
            const intersectionPoints = [];
            for(let i = 0; i < raysCrossing.length - 1; i++)
            {
                const ray1 = raysCrossing[i];
                for(let j = i+1; j < raysCrossing.length; j++)
                {
                    const ray2 = raysCrossing[j]

                    const point = getIntersectionPointOfRays(ray1, ray2);
                    if(point != -1) intersectionPoints.push(point);
                }
            }

            return intersectionPoints;
        }

        /**
         * Sort the array of vertices passed as an argument so that they are ordered according to the convex shape they create
         * 
         * @param {Array} coveredPoints array of vertices of a convex shape
         * @param {Vector3} planeNormal normal of the plane in which the shape is inscribed
         */
        function sortByAngle(coveredPoints, planeNormal)
        {
            if(coveredPoints.length > 2)
            {
                const center = getBarycentre(coveredPoints);
                const vector = new Vector3();
                vector.subVectors(coveredPoints[0], center);
                const vectorPerp = vector.clone();
                vectorPerp.applyAxisAngle(planeNormal, Math.PI/2.0);

                coveredPoints.sort((A,B) => {
                    const vectorA = new Vector3();
                    vectorA.subVectors(A, center);
                
                    const vectorB = new Vector3();
                    vectorB.subVectors(B, center);
                    
                    const dotProdA = Math.abs(vectorPerp.dot(vectorA)) > 0.001 ? vectorPerp.dot(vectorA) : 1;
                    const dotProdB = Math.abs(vectorPerp.dot(vectorB)) > 0.001 ? vectorPerp.dot(vectorB) : 1;

                    return Math.abs(dotProdB) / dotProdB * vector.angleTo(vectorB) - Math.abs(dotProdA) / dotProdA * vector.angleTo(vectorA);
                });
            }
        }

        /**
         * Calculate the area of a convex shape
         * 
         * @param {Array} borderPoints array of Vector3 vertices of a convex shape. They must be ordered
         * @returns {float} value of area of the shape delimited by borderPoints
         */
        function calculateArea(borderPoints, unitValue)
        {
            let areaValue = 0;
            /** MATH PARAGRAPH
             * 
             * If ABC is a triangle
             * vAB is the vector from A to B
             * vAC is the vector from A to C
             * A is the area value of the triangle
             *  A = (1/2) * || vAB ^ vAC ||
             * 
             * In three js, a shape is drawn thanks to the triangles it is composed of
             * The sum of the areas of those triangles gives the total area of the shape 
             */
            for(let i = 1; i < borderPoints.length - 1; i++)
            {
                const vectorAB = new Vector3().subVectors(borderPoints[i], borderPoints[0]);

                const vectorAC = new Vector3().subVectors(borderPoints[i + 1], borderPoints[0]);

                const areaOfThisTriangle = 0.5 * vectorAB.cross(vectorAC).length();
                areaValue += areaOfThisTriangle;
            }

            return areaValue  * (unitValue * unitValue);
        }

        function getBarycentre(points)
        {
            let barycentre = new Vector3();
            if (points.length !== 0)
            {
                points.forEach(p => barycentre.add(p));
                barycentre.divideScalar(points.length);
            }
            return barycentre;
        }

        function drawAreaWithPoints(coveredPoints, color = 0x008888)
        {
            const geometryArea = new BufferGeometry();
            const verticesArray = [];
            
            for(let i = 1; i < coveredPoints.length - 1; i++)
            {
                verticesArray.push(coveredPoints[i + 1].x);
                verticesArray.push(coveredPoints[i + 1].y);
                verticesArray.push(coveredPoints[i + 1].z);

                verticesArray.push(coveredPoints[i].x);
                verticesArray.push(coveredPoints[i].y);
                verticesArray.push(coveredPoints[i].z);

                verticesArray.push(coveredPoints[0].x);
                verticesArray.push(coveredPoints[0].y);
                verticesArray.push(coveredPoints[0].z);
            }

            const vertices = new Float32Array( verticesArray );

            geometryArea.setAttribute( 'position', new BufferAttribute( vertices, 3 ) );
            const materialArea = new MeshBasicMaterial( {side: DoubleSide, color: color, transparent: true, opacity: 0.6, alphaTest: 0.5 } );
            
            const areaCovered = new Mesh( geometryArea, materialArea );
            return(areaCovered);
        }

        /* UPDATE */
        this.update = function ()
        {
            this.objects.update();
        }

        // initialize three js scene
        this.initScene();

        // DEBUG
        this.debug = function()
        {
        }
    }
}

export { SceneManager }

/**
 * Returns the ray intersection of plane1 and plane2
 * 
 * @param {Plane} plane1 
 * @param {Plane} plane2 
 * @returns {Ray} the intersection of the planes or -1 if planes are coincident or parrallel
 */
function getIntersectionOfPlanes(plane1, plane2)
{
    if(plane1.normal.length() < 0.001 || plane2.normal.length() < 0.001)
    {
        console.error("invalid parameters : one of the plane's normal is zero Vector");
        return -1;
    }
    const a1 = plane1.normal.x;
    const b1 = plane1.normal.y;
    const c1 = plane1.normal.z;
    const d1 = plane1.constant;

    const a2 = plane2.normal.x;
    const b2 = plane2.normal.y;
    const c2 = plane2.normal.z;
    const d2 = plane2.constant;

    const intersectionRayDirection = new Vector3().crossVectors(plane1.normal, plane2.normal);
    if(intersectionRayDirection.length() < 0.001)
    {
        //Coincident or parrallel planes
        return -1;
    }

    /** MATH PARAGRAPH
     * 
     * Planes equations are
     *  a1 * x + b1 * y + c1 * z + d1 = 0
     *  a2 * x + b2 * y + c2 * z + d2 = 0
     * 
     * We want to get the all (x,y,z) triplet respecting both the equation (will be a 3D line)
     * 
     * if a1 != 0 :
     *      // in this case, a1 and a2 are 'main' arguments for calculatePointOnIntersectionRayCoordinates function
     *      // mode argument is 'abc'
     * 
     *      if a1 * b2 - a2 * b1 != 0
     *          // in this case, b1 and b2 are 'secondary' arguments for calculatePointOnIntersectionRayCoordinates function
     * 
     *          |                  a1 * x   =   - b1 * y - c1 * t - d1                            // from first plane equation
     *          |                  b2 * y   =   - a2 * x - c2 * t - d2                            // from second plane equation
     *          |                       z   =   t                                                 // 2 equations, 3 variables: one variable is a parameter
     * 
     *          <=>
     * 
     *          |                       x   =   (1/a1) * (- b1 * y - c1 * t - d1)                 // second coordinate that can be deduct
     *          | (a1 * b2 - a2 * b1) * y   =   (a2 * c1 - a1 * c2) * t + (a2 * d1 - a1 * d2)     // first coordinate that can be deduct
     *          |                       z   =   t                                                 // param Variable 
     * 
     *          t = 0 gives the origin of the ray, and normal1 ^ normal2 gives its direction
     * 
     * 
     *      if a1 * c2 - a2 * c1 != 0
     *          // in this case, c1 and c2 are 'secondary' arguments for calculatePointOnIntersectionRayCoordinates function
     *          // mode argument is 'acb'
     * 
     *          |                  a1 * x   =   - b1 * t - c1 * z - d1                            // from first plane equation
     *          |                       y   =   t                                                 // 2 equations, 3 variables: one variable is a parameter
     *          |                  c2 * z   =   - a2 * x - b2 * t - d2                            // from second plane equation
     * 
     *          <=>
     * 
     *          |                       x   =   (1/a1) * (- b1 * t - c1 * z - d1)                 // second coordinate that can be deduct
     *          |                       y   =   t                                                 // param Variable
     *          | (a1 * c2 - a2 * c1) * z   =   (a2 * b1 - a1 * b2) * t + (a2 * d1 - a1 * d2)     // first coordinate that can be deduct
     * 
     *          t = 0 gives the origin of the ray, and normal1 ^ normal2 gives its direction
     * 
     * 
     *      else means a1 * b2 - a2 * b1 = 0 AND a1 * c2 - a2 * c1 = 0 which means normals are colinear, and planes are parrallel or coincident.
     *      This case must have been avoided earlier
     * 
     * Same for b1 != 0 and c1 != 0 (Normals of planes cannot be zero vectors. This case must have been avoided earlier)
     */

    if(Math.abs(a1) > 0.001)
    {
        if(Math.abs(a1 * b2 - a2 * b1) > 0.001)
        {
            return getIntersectionRay('abc');
        }
        else if(Math.abs(a1 * c2 - a2 * c1) > 0.001)
        {
            return getIntersectionRay('acb');
        }
        else
        {
            console.error("There is a mathematical incoherence in the code");
            return -1;
        }
    }

    else if(Math.abs(b1) > 0.001)
    {
        if(Math.abs(b1 * c2 - b2 * c1) > 0.001)
        {
            return getIntersectionRay('bca');
        }
        else if(Math.abs(b1 * a2 - b2 * a1) > 0.001)
        {
            return getIntersectionRay('bac');
        }
        else
        {
            console.error("There is a mathematical incoherence in the code");
            return -1;
        }
    }
    
    else if(Math.abs(c1) > 0.001)
    {
        if(Math.abs(c1 * a2 - c2 * a1) > 0.001)
        {
            return getIntersectionRay('cab');
        }
        else if(Math.abs(c1 * b2 - c2 * b1) > 0.001)
        {
            return getIntersectionRay('cba');
        }
        else
        {
            console.error("There is a mathematical incoherence in the code");
            return -1;
        }
    }

    else
    {
        console.error("invalid parameters : one of the plane's normal is zero vector");
        return -1;
    }
    
    /**
     * get a Ray object which represents the intersection of planes.
     * @param {string} mode Can be {'abc', 'acb', 'bca', 'bac', 'cab', 'cba'} depending on 'main', 'secondary' and third parameter. See math paragraph above.
     * @returns {Ray} intersection ray of the planes. -1 if 'order' argument is not valid
     */
    function getIntersectionRay(mode){
        switch(mode){
            case 'abc':
            {
                const originCoordinates = calculatePointOnIntersectionRayCoordinates(a1, a2, b1, b2, c1, c2, mode);
                return new Ray(originCoordinates, intersectionRayDirection.normalize());
            }
            case 'acb':
            {
                const originCoordinates = calculatePointOnIntersectionRayCoordinates(a1, a2, c1, c2, b1, b2, mode);
                return new Ray(originCoordinates, intersectionRayDirection.normalize());
            }
            case 'bca':
            {
                const originCoordinates = calculatePointOnIntersectionRayCoordinates(b1, b2, c1, c2, a1, a2, mode);
                return new Ray(originCoordinates, intersectionRayDirection.normalize());
            }
            case 'bac':
            {
                const originCoordinates = calculatePointOnIntersectionRayCoordinates(b1, b2, a1, a2, c1, c2, mode);
                return new Ray(originCoordinates, intersectionRayDirection.normalize());
            }
            case 'cab':
            {
                const originCoordinates = calculatePointOnIntersectionRayCoordinates(c1, c2, a1, a2, b1, b2, mode);
                return new Ray(originCoordinates, intersectionRayDirection.normalize());
            }
            case 'cba':
            {
                const originCoordinates = calculatePointOnIntersectionRayCoordinates(c1, c2, b1, b2, a1, a2, mode);
                return new Ray(originCoordinates, intersectionRayDirection.normalize());
            }
            default:
                console.error("getInteresectionRay: the 'mode' argument is not valid");
                return -1;
        }
    }

    /**
     * See math paragraph to well understand this function. Calculate a point on the ray intersection depending on param argument
     * @param {float} m1 "main" coordinate of the normal 1 (first letter of 'mode')
     * @param {float} m2 "main" coordinate of the normal 2 (first letter of 'mode')
     * @param {float} s1 "secondary" coordinate of the normal 1 (second letter of 'mode')
     * @param {float} s2 "secondary" coordinate of the normal 2 (second letter of 'mode')
     * @param {float} t1 "third" coordinate of the normal 1 (third letter of 'mode')
     * @param {float} t2 "third" coordinate of the normal 2 (third letter of 'mode')
     * @param {string} mode Can be {'abc', 'acb', 'bca', 'bac', 'cab', 'cba'}
     * @param {float} param parameter of the line, default is 0
     * @returns {Vector3} a point on the intersection line of the planes at the parameter param.
     */
    function calculatePointOnIntersectionRayCoordinates(m1, m2, s1, s2, t1, t2, mode, param = 0)
    {
        const paramVar = param;
        const firstDeduct = ((m2 * t1 - m1 * t2) * paramVar + (m2 * d1 - m1 * d2)) / (m1 * s2 - m2 * s1);
        const secondDeduct = (- s1 * firstDeduct - t1 * paramVar - d1) / m1;

        switch(mode){
            case 'abc':
                return new Vector3(secondDeduct, firstDeduct, paramVar);
            case 'acb': 
                return new Vector3(secondDeduct, paramVar, firstDeduct);
            case 'bca':
                return new Vector3(paramVar, secondDeduct, firstDeduct);
            case 'bac': 
                return new Vector3(firstDeduct, secondDeduct, paramVar);
            case 'cab':
                return new Vector3(firstDeduct, paramVar, secondDeduct);
            case 'cba': 
                return new Vector3(paramVar, firstDeduct, secondDeduct);
            default:
                console.error("calculatePointsOnIntersectionRayCoordinates: the 'mode' argument is not valid");
                return -1;
        }
    }
}
 
 /**
  * Returns the intersection point of ray1 and ray2
  * 
  * @param {Ray} ray1 
  * @param {Ray} ray2 
  * @returns {Vector3} the intersection of the rays or -1 if rays do not cross or are coincident
  */
function getIntersectionPointOfRays(ray1, ray2)
{
    const o1 = ray1.origin;
    const d1 = ray1.direction;
    const o2 = ray2.origin;
    const d2 = ray2.direction;
    
    const normal = new Vector3().crossVectors(d1,d2);

    //no intersection points if rays are parrallel or coincident
    if(normal.length() < 0.001) return -1;

    //no intersection points if rays are not coplanar
    const plane = new Plane().setFromCoplanarPoints(o1, new Vector3().addVectors(o1, d1), new Vector3().addVectors(o2, d2))
    if(Math.abs(plane.distanceToPoint(o2)) > 0.001) return -1;

    /** MATH PARAGRAPH
     * 
     * Every points of rays can be written as :
     *  o1 + d1 * t     for ray1
     *  o2 + d2 * t'    for ray2
     * 
     * We want to get t as 
     *  o1 + d1 * t = o2 + d2 * t'
     * so we can calclate the intersection point of the rays: I = o1 + d1 * t 
     * 
     * We have those three equations:
     *  | o1.x + d1.x * t = o2.x + d2.x * t'
     *  | o1.x + d1.x * t = o2.x + d2.x * t'
     *  | o1.x + d1.x * t = o2.x + d2.x * t'
     * 
     * if d2.x != 0:
     * 
     *      t' = (1 / d2.x) * (d1.x * t + o1.x - o2.x)
     *  
     *      if d2.x * d1.y - d2.y * d1.x != 0:
     *          
     *          (d2.x * d1.y - d2.y * d1.x) * t = d2.y * (o1.x - o2.x) + d2.x * (o2.y - o1.y)
     * 
     *      if d2.x * d1.z - d2.z * d1.x != 0:
     *          
     *          (d2.x * d1.z - d2.z * d1.x) * t = d2.z * (o1.x - o2.x) + d2.x * (o2.z - o1.z)
     * 
     *      else means d2.x * d1.y - d2.y * d1.x = 0 AND d2.x * d1.z - d2.z * d1.x = 0 which means rays are parrallel or coincident.
     *      This case must have been avoided earlier
     * 
     * Same for d2.y != 0 and d2.z != 0 (Direction of lines cannot be zero vectors. This case must have been avoided earlier)
     */

    const intersectionPoint = new Vector3();
    if(Math.abs(d2.x) > 0.001)
    {
        if(Math.abs(d2.x * d1.y - d2.y * d1.x) > 0.001)
        {
            const param = (1/ (d2.x * d1.y - d2.y * d1.x)) * (d2.y * (o1.x - o2.x) + d2.x * (o2.y - o1.y))
            ray1.at(param, intersectionPoint);
            return intersectionPoint;
        }
        else if(Math.abs(d2.x * d1.z - d2.z * d1.x) > 0.001)
        {
            const param = (1/ (d2.x * d1.z - d2.z * d1.x)) * (d2.z * (o1.x - o2.x) + d2.x * (o2.z - o1.z))
            ray1.at(param, intersectionPoint);
            return intersectionPoint;
        }
        else
        {
            console.error("There is a mathematical incoherence in the code");
            return -1;
        }
    }

    else if(d2.y != 0)
    {
        if(Math.abs(d2.y * d1.z - d2.z * d1.y) > 0.001)
        {
            const param = (1/ (d2.y * d1.z - d2.z * d1.y)) * (d2.z * (o1.y - o2.y) + d2.y * (o2.z - o1.z))
            ray1.at(param, intersectionPoint);
            return intersectionPoint;
        }
        else if(Math.abs(d2.y * d1.x - d2.x * d1.y) > 0.001)
        {
            const param = (1/ (d2.y * d1.x - d2.x * d1.y)) * (d2.x * (o1.y - o2.y) + d2.y * (o2.x - o1.x))
            ray1.at(param, intersectionPoint);
            return intersectionPoint;
        }
        else
        {
            console.error("There is a mathematical incoherence in the code");
            return -1;
        }
    }

    else if(d2.z != 0)
    {
        if(Math.abs(d2.z * d1.x - d2.x * d1.z) > 0.001)
        {
            const param = (1/ (d2.z * d1.x - d2.x * d1.z)) * (d2.x * (o1.z - o2.z) + d2.z * (o2.x - o1.x))
            ray1.at(param, intersectionPoint);
            return intersectionPoint;
        }
        else if(Math.abs(d2.z * d1.y - d2.y * d1.z) > 0.001)
        {
            const param = (1/ (d2.z * d1.y - d2.y * d1.z)) * (d2.y * (o1.z - o2.z) + d2.z * (o2.y - o1.y))
            ray1.at(param, intersectionPoint);
            return intersectionPoint;
        }
        else
        {
            console.error("There is a mathematical incoherence in the code");
            return -1;
        }
    }

    else
    {
        console.error("invalid parameters : one of the rays direction is zero vector");
        return -1;
    }
}