import { camerasTypes, units } from '../data.js'

import { SceneManager } from '../scene/SceneManager.js'

class Wizard{
    constructor()
    {
        addCamTypesToForm();

        this.bindEventListeners = function(viewportManager)
        {
            const sceneManager = viewportManager.sceneManager;
            const formModal = document.getElementById('wizard-modal');
            document.getElementById('open-wizard-button').addEventListener('click', () => {
                if(sceneManager.augmentaSceneLoaded)
                {
                    initWizardValues(sceneManager);
                    formModal.classList.remove('hidden');
                }
            });
            document.getElementById('close-wizard').addEventListener('click', () => formModal.classList.add('hidden'));
            
            window.addEventListener('mousedown', () => {
                if(event.target === formModal) formModal.classList.add('hidden');
            });

            const camCheckboxes = document.getElementsByClassName('checkbox-camera-type');
            for(let i = 0; i < camCheckboxes.length; i++)
            {
                camCheckboxes[i].addEventListener('change', () => checkFormCoherence(sceneManager));
            }
            document.getElementById('input-hook-height-wizard').addEventListener('change', () => checkFormCoherence(sceneManager));

            function checkFormCoherence(sceneManager)
            {
                const maxFar = getMaxFarFromCheckedCam()
                if(document.getElementById('input-hook-height-wizard').value / sceneManager.currentUnit.value > maxFar)
                {
                    document.getElementById('input-hook-height-wizard').style.color = "red";
                    const warningElem = document.getElementById('warning-hook-height');
                    if(!warningElem)
                    {
                        const newWarningElem = document.createElement("p");
                        newWarningElem.id = 'warning-hook-height';
                        newWarningElem.innerHTML = `The camera(s) you chose cannot see your tracking surface that far (max = <span data-unit=` + sceneManager.currentUnit.value + `>` + (Math.round((maxFar * sceneManager.currentUnit.value) * 100) / 100.0) + `</span> <span data-unittext=` + sceneManager.currentUnit.label + `>` + sceneManager.currentUnit.label + `</span>)`;
                        newWarningElem.style.color = "red";
                        document.getElementById('hook-height-input').appendChild(newWarningElem);
                    }
                }
                else
                {
                    document.getElementById('input-hook-height-wizard').style.color = "black";
                    const warningElem = document.getElementById('warning-hook-height');
                    if(warningElem) warningElem.remove();
                }
            }

            document.getElementById('generate-scene-wizard-button').addEventListener('click', () => {
                createSceneFromWizard(sceneManager);
                viewportManager.placeCamera();
            });
        }

        function initWizardValues(sceneManager)
        {
            document.getElementById('input-scene-width-wizard').value = Math.round(sceneManager.sceneWidth * sceneManager.currentUnit.value * 100) / 100.0;
            document.getElementById('input-scene-height-wizard').value = Math.round(sceneManager.sceneHeight * sceneManager.currentUnit.value * 100) / 100.0;
            document.getElementById('input-hook-height-wizard').value = parseFloat(document.getElementById('input-hook-height-wizard').value) > 0 ? document.getElementById('input-hook-height-wizard').value : Math.round(4.5 * sceneManager.currentUnit.value * 100) / 100.0;
            document.getElementById('input-percent-overlap-wizard'). value = parseFloat(document.getElementById('input-percent-overlap-wizard').value) > 0 ? document.getElementById('input-percent-overlap-wizard').value : 15;
        }

        function addCamTypesToForm(){
            const camTypesForm = document.getElementById('cam-types-checkboxes-wizard');
            /*while (camTypesForm.firstChild) {
                camTypesForm.removeChild(camTypesForm.firstChild);
            }
            let title = document.createElement("h3");
            title.innerHTML = "Choose the type.s of camera.s you want to use";
            camTypesForm.appendChild(title);*/
            camerasTypes.filter(c => c.recommended).forEach(c => {
                //const hookHeight = parseFloat(document.getElementById('input-hook-height-wizard').value);
                //if(hookHeight < c.rangeFar && c.suitable.includes(document.getElementById('tracking-mode-selection-wizard').value))
                //{
                    const camTypeChoice = document.createElement("div");
                    const camTypeCheckbox = document.createElement("input");
                    camTypeCheckbox.setAttribute("type", "checkbox");
                    if(c.checkedDefault) camTypeCheckbox.setAttribute("checked", "true");
                    camTypeCheckbox.id = "check-" + c.id;
                    camTypeCheckbox.classList.add('checkbox-camera-type');
                    const label = document.createElement("label");
                    label.setAttribute("for", "check-" + c.id)
                    label.innerHTML = c.name;

                    const url = document.location.href;
                    if(url.includes('beta')) label.classList.add('dark-mode');

                    camTypeChoice.appendChild(camTypeCheckbox);
                    camTypeChoice.appendChild(label);
                    camTypesForm.appendChild(camTypeChoice);
                //}
            });
        }

        function getMaxFarFromCheckedCam()
        {
            const camCheckboxes = document.getElementsByClassName('checkbox-camera-type');
            const camElementsChecked = [];
            for(let i = 0; i < camCheckboxes.length; i++)
            {
                if(camCheckboxes[i].checked) camElementsChecked.push(camCheckboxes[i]);
            }
            if(camElementsChecked.length > 0)
            {
                const camTypesChecked = [];
                camElementsChecked.forEach(c => {
                    const id = c.id;
                    const last = id.charAt(id.length - 1);
                    camTypesChecked.push(parseFloat(last));
                });
                const camerasChecked = camerasTypes.filter(c => camTypesChecked.includes(c.id));
    
                camerasChecked.sort((A,B) => B.rangeFar - A.rangeFar)
                return camerasChecked[0].rangeFar;
            }
        }

        function createSceneFromWizard(sceneManager)
        {
            const inputWidth = parseFloat(document.getElementById('input-scene-width-wizard').value);
            const inputHeight = parseFloat(document.getElementById('input-scene-height-wizard').value);
            const camsHeight = Math.round(parseFloat(document.getElementById('input-hook-height-wizard').value) / sceneManager.currentUnit.value * 100) / 100;
            
            const percentOverlapped = parseFloat(document.getElementById('input-percent-overlap-wizard').value) / 100.0;

            if(percentOverlapped > 0.99 || percentOverlapped < 0)
            {
                alert("Invalid overlap parameter");
                return;
            }

            if(!inputWidth || !inputHeight)
            {
                alert("Please fill your scene horizontal and vertical length");
                return;
            }
            if(!camsHeight)
            {
                alert("Please fill the hook height from your scene");
                return;
            }

            const givenWidth = Math.ceil(inputWidth / sceneManager.currentUnit.value * 100) / 100;
            const givenHeight = Math.ceil(inputHeight / sceneManager.currentUnit.value * 100) / 100;

            let configs = [];

            camerasTypes.filter(c => c.recommended).forEach(type => {
                if(document.getElementById('check-' + type.id).checked && camsHeight <= type.rangeFar && camsHeight >= type.rangeNear)
                {
                    const totalWidthCovered = Math.abs(Math.tan((type.HFov/2.0) * Math.PI / 180.0))*(camsHeight) * 2;
                    const totalHeightCovered = Math.abs(Math.tan((type.VFov/2.0) * Math.PI / 180.0))*(camsHeight) * 2;

                    const widthAreaCovered = totalWidthCovered * (1 - percentOverlapped);
                    const heightAreaCovered = totalHeightCovered * (1 - percentOverlapped);

                    const nbcamsNoRotWidth = Math.ceil(givenWidth / widthAreaCovered - (percentOverlapped / (1 - percentOverlapped)));
                    const nbCamsNoRotHeight = Math.ceil(givenHeight / heightAreaCovered - (percentOverlapped / (1 - percentOverlapped)));
                    const nbCamsRotWidth = Math.ceil(givenWidth / heightAreaCovered - (percentOverlapped / (1 - percentOverlapped)));
                    const nbCamsRotHeight = Math.ceil(givenHeight / widthAreaCovered - (percentOverlapped / (1 - percentOverlapped)));

                    nbCamsRotWidth * nbCamsRotHeight < nbcamsNoRotWidth * nbCamsNoRotHeight
                        ?
                        configs.push({ typeID: type.id, w: totalHeightCovered, h: totalWidthCovered, nbW: nbCamsRotWidth, nbH: nbCamsRotHeight, rot: true })
                        :
                        configs.push({ typeID: type.id, w: totalWidthCovered, h: totalHeightCovered, nbW: nbcamsNoRotWidth, nbH: nbCamsNoRotHeight, rot: false });
                }
            });

            if(configs.length === 0)
            {
                alert("No sensor is adapted to your demand");
                return;
            }
            else
            {
                sceneManager.updateAugmentaSceneBorder(inputWidth, inputHeight);

                configs.sort((A,B) => A.nbW * A.nbH - B.nbW * B.nbH);
                configs = configs.filter(c => c.nbW * c.nbH === configs[0].nbW * configs[0].nbH);
                configs.sort((A,B) => A.typeID - B.typeID);
                let chosenConfig = configs[0];
                sceneManager.objects.removeNodes();

                let offsetX = chosenConfig.w / 2.0;
                let offsetY = chosenConfig.h / 2.0;
                if(chosenConfig.nbW === 1) offsetX -= (chosenConfig.nbW*chosenConfig.w - givenWidth)/2.0;
                if(chosenConfig.nbH === 1) offsetY -= (chosenConfig.nbH*chosenConfig.h - givenHeight)/2.0;
                const oX = chosenConfig.nbW > 1 ? (chosenConfig.nbW*chosenConfig.w - givenWidth)/(chosenConfig.nbW - 1) : 0;
                const oY = chosenConfig.nbH > 1 ? (chosenConfig.nbH*chosenConfig.h - givenHeight)/(chosenConfig.nbH - 1) : 0;

                for(let i = 0; i < chosenConfig.nbW; i++)
                {
                    for(let j = 0; j < chosenConfig.nbH; j++)
                    {
                        chosenConfig.rot 
                            ?
                            sceneManager.objects.addNode(true, chosenConfig.typeID, offsetX + i*(chosenConfig.w - oX), camsHeight, offsetY + j*(chosenConfig.h - oY), 0, 0, Math.PI/2.0)
                            :
                            sceneManager.objects.addNode(true, chosenConfig.typeID, offsetX + i*(chosenConfig.w - oX), camsHeight, offsetY + j*(chosenConfig.h - oY));

                    }
                }

                // update inspector infos
                document.getElementById('input-scene-width-inspector').value = inputWidth;
                document.getElementById('input-scene-height-inspector').value = inputHeight;
    
                //placeCamera(new THREE.Vector3(givenWidth, 6, givenHeight));
                document.getElementById('wizard-modal').classList.add('hidden');
            }
        }
    }
}

export { Wizard }
