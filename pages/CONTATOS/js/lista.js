import { db } from '../../../js/firebase-config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

let drivers = [];

document.addEventListener('DOMContentLoaded', async function() {
    await getDrivers();

    document.getElementById('backBtn').addEventListener('click', function() {
        window.location.href = 'contato.html';
    });

    document.getElementById('searchInput').addEventListener('input', function() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filteredDrivers = drivers.filter(driver => {
            return driver.driver.toLowerCase().includes(searchTerm) ||
                   driver.phone.toLowerCase().includes(searchTerm) ||
                   driver.owner.toLowerCase().includes(searchTerm);
        });
        renderTable(filteredDrivers);
    });

    document.getElementById('downloadBtn').addEventListener('click', function() {
        if (drivers.length === 0) {
            alert("Nenhum dado disponível para download.");
            return;
        }

        const dataToExport = drivers.map(driver => ({
            Motorista: driver.driver,
            Telefone: driver.phone,
            Frotista: driver.owner
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "Motoristas");
        XLSX.writeFile(wb, 'motoristas.xlsx');
    });
});

async function getDrivers() {
    const querySnapshot = await getDocs(collection(db, 'drivers'));
    drivers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sortAndRenderTable();
}

function sortAndRenderTable() {
    drivers.sort((a, b) => a.driver.localeCompare(b.driver) || a.owner.localeCompare(b.owner));
    renderTable(drivers);
}

function renderTable(driversToRender) {
    const tableBody = document.querySelector('#driversTable tbody');
    tableBody.innerHTML = '';

    driversToRender.forEach((driverData) => {
        const row = document.createElement('tr');

        const driverCell = document.createElement('td');
        driverCell.textContent = driverData.driver;
        row.appendChild(driverCell);

        const phoneCell = document.createElement('td');
        phoneCell.textContent = driverData.phone;
        row.appendChild(phoneCell);

        const ownerCell = document.createElement('td');
        ownerCell.textContent = driverData.owner;
        row.appendChild(ownerCell);

        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions';

        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.className = 'edit';
        editButton.addEventListener('click', () => editDriver(driverData.id));
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Apagar';
        deleteButton.addEventListener('click', () => deleteDriver(driverData.id));
        actionsCell.appendChild(deleteButton);

        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });
}

async function editDriver(id) {
    localStorage.setItem('editIndex', id);
    window.location.href = 'contato.html';
}

async function deleteDriver(id) {
    if (!confirm('Tem certeza que deseja apagar este motorista?')) return;
    await deleteDoc(doc(db, 'drivers', id));
    drivers = drivers.filter(driver => driver.id !== id);
    sortAndRenderTable();
}
