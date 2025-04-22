import { db } from '../../../js/firebase-config.js';
import { collection, getDocs, doc, deleteDoc, addDoc, setDoc, getDoc } 
    from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

let editIndex = null;

document.getElementById('submitBtn').addEventListener('click', async function() {    
    const driver = document.getElementById('driver').value;
    const phone = document.getElementById('phone').value;
    const owner = document.getElementById('owner').value;

    if (driver && phone && owner) {
        try {
            if (editIndex !== null) {
                await setDoc(doc(db, 'drivers', editIndex), { driver, phone, owner });
                editIndex = null;
            } else {
                await addDoc(collection(db, 'drivers'), { driver, phone, owner });
                alert('Motorista salvo com sucesso!');
            }
            document.getElementById('driverForm').reset();
        } catch (error) {
            console.error("Erro ao salvar motorista:", error);
        }
    } else {
        alert('Por favor, preencha todos os campos.');
    }
});

document.getElementById('viewListBtn').addEventListener('click', function() {
    window.location.href = './lista.html';
});

document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('driver').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('owner').value = '';
});

document.addEventListener('DOMContentLoaded', async function() {
    const editIndexStored = localStorage.getItem('editIndex');
    if (editIndexStored !== null) {
        try {
            const driverDoc = await getDoc(doc(db, 'drivers', editIndexStored));
            if (driverDoc.exists()) {
                const driverData = driverDoc.data();
                document.getElementById('driver').value = driverData.driver;
                document.getElementById('phone').value = driverData.phone;
                document.getElementById('owner').value = driverData.owner;
                editIndex = editIndexStored;
            }
        } catch (error) {
            console.error("Erro ao carregar motorista para edição:", error);
        }
        localStorage.removeItem('editIndex');
    }
});

document.getElementById('phone').addEventListener('input', function(e) {
    const x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? '-' + x[3] : ''}`;
});
