import { SceneManager } from '../scene/SceneManager.js';

import { Wizard } from './Wizard.js';

class UIManager{
    constructor()
    {
        this.wizard = new Wizard();
        resetValues();

        this.bindEventListeners = function(viewportManager)
        {
            const sceneManager = viewportManager.sceneManager
            const copyUrlModal = document.getElementById("share-modal");
            document.getElementById('generate-link').addEventListener('click', () => {
                copyLink(sceneManager.objects.generateLink());
            });
            window.addEventListener('click', () => {
                if(event.target == copyUrlModal) copyUrlModal.classList.add('hidden');
            });

            document.getElementById("input-scene-width-inspector").addEventListener('change', () => sceneManager.updateAugmentaSceneBorder(parseFloat(document.getElementById("input-scene-width-inspector").value), parseFloat(document.getElementById("input-scene-height-inspector").value)));
            document.getElementById("input-scene-height-inspector").addEventListener('change', () => sceneManager.updateAugmentaSceneBorder(parseFloat(document.getElementById("input-scene-width-inspector").value), parseFloat(document.getElementById("input-scene-height-inspector").value)));

            this.wizard.bindEventListeners(viewportManager);
        }

        function resetValues()
        {
            const inputs = document.getElementsByTagName('input');
            for(let i = 0; i < inputs.length; i++)
            {
                inputs[i].dataset.unit = SceneManager.DEFAULT_UNIT.value;
                if(inputs[i].id != 'input-hook-height-wizard') inputs[i].value = 5*SceneManager.DEFAULT_UNIT.value;
                else inputs[i].value = '';
            }
        }

        function copyLink(link)
        {
            navigator.clipboard.writeText(link);

            document.getElementById("share-modal").classList.remove('hidden');
            window.setTimeout(() => document.getElementById("share-modal").classList.add('hidden'), 1500);
        }

        /* UPDATE */
        function isAreaCoveredUI(sceneManager)
        {
            const coversArea = sceneManager.objects.doesCoverArea();
            const coversUI = document.getElementById('scene-fully-covered-icon');
            coversUI.dataset.icon = coversArea ? "ion:checkmark-circle-sharp" : "ion:close-circle";
            coversUI.style = coversArea ? "color: #2b2;" : "color: #b22;";
        }
        
        function changeNumberOfNodes(sceneManager)
        {
            document.getElementById('number-nodes-value').innerHTML = sceneManager.objects.getNbNodes();
        }

        this.update = function(sceneManager)
        {
            isAreaCoveredUI(sceneManager);
            changeNumberOfNodes(sceneManager);
        }
    }
}

export { UIManager }
