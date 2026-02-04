/**
 * EduTrack - Feature Rich Student Tracking Application
 * Stack: Vanilla JS, CSS3, HTML5
 */

const Storage = {
    key: 'edutrack_data_v2',

    get() {
        const raw = localStorage.getItem(this.key);
        const data = raw ? JSON.parse(raw) : {};
        if (!data.students) data.students = [];
        if (!data.absences) data.absences = [];
        if (!data.fees) data.fees = [];
        if (!data.subjects || data.subjects.length === 0) {
            data.subjects = [
                { id: 'sub_math', name: 'Mathématiques' },
                { id: 'sub_fr', name: 'Français' },
                { id: 'sub_ar', name: 'Arabe' },
                { id: 'sub_en', name: 'Anglais' },
                { id: 'sub_pc', name: 'Physique-Chimie' },
                { id: 'sub_svt', name: 'SVT' },
                { id: 'sub_hg', name: 'Histoire-Géographie' },
                { id: 'sub_info', name: 'Informatique' }
            ];
        }
        if (!data.teachers) data.teachers = [];
        if (!data.principals) data.principals = [];
        if (!data.supervisors) data.supervisors = []; // Added Supervisors
        if (!data.grades) data.grades = [];
        return data;
    },

    getCurrentOwnerId() {
        // Logic:
        // 1. If SuperAdmin -> No "owner" (manages principals)
        // 2. If Principal -> Owner is self (id)
        // 3. If Teacher/Supervisor -> Owner is the Principal who created them (ownerId property)

        const role = sessionStorage.getItem('edutrack_role');
        const userStr = sessionStorage.getItem('edutrack_user');

        if (!userStr || role === 'superadmin') return null;

        const user = JSON.parse(userStr);

        if (role === 'principal') return user.id;
        if (role === 'teacher' || role === 'supervisor') return user.ownerId; // Must be set on creation

        return null;
    },

    // Helper to filter data by owner
    filterByOwner(list) {
        const ownerId = this.getCurrentOwnerId();
        if (!ownerId) return list; // Should not happen or for debug

        // Strict Isolation: You only see what matches your ID.
        // Legacy data (no ownerId) is HIDDEN unless claimed.
        return list.filter(item => item.ownerId === ownerId);
    },

    // Check if there is unclaimed data
    hasLegacyData() {
        const data = this.get();
        // Check a few key collections
        return (
            data.students.some(s => !s.ownerId) ||
            data.teachers.some(t => !t.ownerId) ||
            data.subjects.some(s => !s.ownerId)
        );
    },

    // Assign all legacy data to a specific owner
    claimLegacyData(ownerId) {
        const data = this.get();
        let count = 0;

        const collections = ['students', 'teachers', 'subjects', 'grades', 'absences', 'fees', 'supervisors'];
        collections.forEach(col => {
            if (data[col]) {
                data[col].forEach(item => {
                    if (!item.ownerId) {
                        item.ownerId = ownerId;
                        count++;
                    }
                });
            }
        });

        this.save(data);
        return count;
    },

    save(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    },

    // Students
    addStudent(student) {
        const data = this.get();
        student.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
        student.createdAt = new Date().toISOString();

        // Multi-tenancy: Assign Owner
        const ownerId = this.getCurrentOwnerId();
        if (ownerId) student.ownerId = ownerId;

        data.students.push(student);
        this.save(data);
        return student;
    },

    getStudents() {
        return this.filterByOwner(this.get().students);
    },

    deleteStudent(id) {
        const data = this.get();
        data.students = data.students.filter(s => s.id !== id);
        this.save(data);
    },

    // Absences
    addAbsence(absence) {
        const data = this.get();
        absence.id = Date.now().toString();
        // Ensure date is stored. If passed in absence object, use it, else default.
        if (!absence.date) absence.date = new Date().toISOString().split('T')[0];

        // Multi-tenancy
        const ownerId = this.getCurrentOwnerId();
        if (ownerId) absence.ownerId = ownerId;

        data.absences.push(absence);
        this.save(data);
    },

    getStudentAbsences(studentId) {
        // Here we filter absences by the filtered students (implicit safety) 
        // but explicit filter is better.
        const data = this.get();
        const myAbsences = this.filterByOwner(data.absences);

        return myAbsences
            .filter(a => a.studentId === studentId)
            .reduce((total, record) => total + (parseFloat(record.hours) || 0), 0);
    },

    // Fees
    addFee(fee) {
        const data = this.get();
        fee.id = Date.now().toString();
        fee.date = new Date().toISOString();

        const ownerId = this.getCurrentOwnerId();
        if (ownerId) fee.ownerId = ownerId;

        data.fees.push(fee);
        this.save(data);
    },

    // Subjects
    addSubject(subject) {
        const data = this.get();
        subject.id = Date.now().toString();

        const ownerId = this.getCurrentOwnerId();
        if (ownerId) subject.ownerId = ownerId;

        data.subjects.push(subject);
        this.save(data);
    },
    getSubjects() { return this.filterByOwner(this.get().subjects); },
    deleteSubject(id) {
        const data = this.get();
        data.subjects = data.subjects.filter(s => s.id !== id);
        this.save(data);
    },

    // Teachers
    addTeacher(teacher) {
        const data = this.get();
        teacher.id = Date.now().toString();

        const ownerId = this.getCurrentOwnerId();
        if (ownerId) teacher.ownerId = ownerId;

        data.teachers.push(teacher);
        this.save(data);
    },
    getTeachers() { return this.filterByOwner(this.get().teachers); },
    deleteTeacher(id) {
        const data = this.get();
        data.teachers = data.teachers.filter(t => t.id !== id);
        this.save(data);
    },

    // Principals
    addPrincipal(principal) {
        const data = this.get();
        principal.id = Date.now().toString();
        data.principals.push(principal);
        this.save(data);
    },
    getPrincipals() { return this.get().principals; },
    deletePrincipal(id) {
        const data = this.get();
        data.principals = data.principals.filter(p => p.id !== id);
        this.save(data);
    },

    // Supervisors
    addSupervisor(supervisor) {
        const data = this.get();
        supervisor.id = Date.now().toString();

        const ownerId = this.getCurrentOwnerId();
        if (ownerId) supervisor.ownerId = ownerId;

        data.supervisors.push(supervisor);
        this.save(data);
    },
    getSupervisors() { return this.filterByOwner(this.get().supervisors); },
    deleteSupervisor(id) {
        const data = this.get();
        data.supervisors = data.supervisors.filter(s => s.id !== id);
        this.save(data);
    },

    // Grades
    saveGrades(gradesInput) {
        const data = this.get();
        // data.grades is flat list: { id, studentId, subjectId, term, values: [], average, appreciation }

        gradesInput.forEach(input => {
            // Remove existing grade for this student+subject+term
            data.grades = data.grades.filter(g =>
                !(g.studentId === input.studentId && g.subjectId === input.subjectId && g.term === input.term)
            );

            // Add new if at least one value exists or average is present or appreciation is present
            const hasValues = (input.values && input.values.some(v => v !== "")) || input.appreciation;
            if (hasValues) {
                data.grades.push({
                    id: Date.now().toString() + Math.random(),
                    studentId: input.studentId,
                    subjectId: input.subjectId,
                    term: input.term,
                    values: input.values,
                    average: input.average,
                    appreciation: input.appreciation,
                    ownerId: input.ownerId || this.getCurrentOwnerId() // Add OwnerId to grades
                });
            }
        });
        this.save(data);
    },
    getGrades(subjectId, term) {
        return this.filterByOwner(this.get().grades).filter(g => g.subjectId === subjectId && g.term === term);
    },

    migrateData(silent = false) {
        const data = this.get();
        let changed = false;

        const migrateLevel = (l) => {
            if (!l) return l;
            const s = l.toString().toLowerCase().trim();
            if (s.includes('7')) return '5ème';
            if (s.includes('8')) return '4ème';
            if (s.includes('9')) return '3ème';
            return l;
        };

        // Migrate Students
        if (data.students) {
            data.students.forEach(s => {
                // Special handling for preserving division if it was merged in level (e.g. "7ème 1")
                if (s.level && (s.level.includes('7') || s.level.includes('8') || s.level.includes('9'))) {
                    // Try to extract suffix if classroom is empty
                    if (!s.classroom || s.classroom.trim() === '') {
                        const match = s.level.match(/\d+(?:eme|ème)?\s*([a-zA-Z0-9]+)/i);
                        if (match && match[1]) {
                            // Check if the suffix is just "eme" or "ème" which is not a division
                            const suffix = match[1].toLowerCase();
                            if (suffix !== 'ème' && suffix !== 'eme') {
                                s.classroom = match[1].toUpperCase();
                                changed = true;
                            }
                        }
                    }
                }

                const newLevel = migrateLevel(s.level);
                if (newLevel !== s.level) {
                    s.level = newLevel;
                    changed = true;
                }
            });
        }

        // Migrate Teachers
        if (data.teachers) {
            data.teachers.forEach(t => {
                if (t.assignedClasses) {
                    t.assignedClasses.forEach(c => {
                        const newLevel = migrateLevel(c.level);
                        if (newLevel !== c.level) {
                            c.level = newLevel;
                            changed = true;
                        }
                    });
                }
                if (changed) {
                    this.save(data);
                    const msg = "Correction automatique des niveaux effectuée !";
                    console.log(msg);
                    if (!silent) {
                        alert(msg);
                        location.reload(); // Reload to show changes
                    }
                } else {
                    console.log("Aucune correction nécessaire.");
                }
            });
        }
    },

    // Login History
    getLoginHistory() {
        const raw = localStorage.getItem('edutrack_login_history');
        return raw ? JSON.parse(raw) : [];
    },
    saveLoginHistory(user, role) {
        let history = this.getLoginHistory();
        // Remove if exists (deduplicate)
        history = history.filter(u => u.username !== user.username);
        // Add to top
        history.unshift({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: role,
            avatar: user.avatar,
            lastLogin: new Date().toISOString()
        });
        // Limit to 3 items
        if (history.length > 3) history.pop();
        localStorage.setItem('edutrack_login_history', JSON.stringify(history));
    },
    removeLoginHistory(username) {
        let history = this.getLoginHistory();
        history = history.filter(u => u.username !== username);
        localStorage.setItem('edutrack_login_history', JSON.stringify(history));
    }
};

const UI = {
    triggerMigration() {
        const count = Storage.migrateData(false); // Not silent, show alert
        if (count === undefined) alert("Vérification terminée. Si rien ne change, c'est que les données sont déjà correctes ou ne correspondent pas au format attendu (exemple : '7ème 1').");
    },

    switchReportTerm(studentId, term) {
        const student = Storage.getStudents().find(s => s.id === studentId);
        if (student) {
            UI.renderReportCardModal(student, term);
        }
    },

    navigate(view) {
        // Update Active Nav
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navBtn = document.querySelector(`button[onclick="app.navigate('${view}')"]`);
        if (navBtn) navBtn.classList.add('active');

        // Update Title
        const titles = {
            'dashboard': 'Tableau de bord',
            'students': 'Gestion des Élèves',
            'absences': 'Suivi des Absences',
            'fees': 'Frais Scolaires',
            'subjects': 'Gestion des Matières',
            'teachers': 'Gestion des Professeurs',
            'grades': 'Saisie des Notes',
            'principals': 'Gestion des Principaux'
        };
        document.getElementById('page-title').innerText = titles[view] || 'EduTrack';

        // Render Content
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = ''; // Clear current content

        if (view === 'dashboard') this.renderDashboard(contentArea);
        else if (view === 'students') this.renderStudents(contentArea);
        else if (view === 'absences') this.renderAbsences(contentArea);
        else if (view === 'fees') this.renderFees(contentArea);
        else if (view === 'subjects') this.renderSubjects(contentArea);
        else if (view === 'teachers') this.renderTeachers(contentArea);
        else if (view === 'grades') this.renderGrades(contentArea);
        else if (view === 'principals') this.renderPrincipals(contentArea);
        else if (view === 'supervisors') this.renderSupervisors(contentArea);
    },

    renderDashboard(container) {
        // Use filtered getters to respect Multi-Tenancy
        const students = Storage.getStudents();
        const teachers = Storage.getTeachers();
        const supervisors = Storage.getSupervisors();

        // College Name Logic
        const role = sessionStorage.getItem('edutrack_role');
        const user = JSON.parse(sessionStorage.getItem('edutrack_user') || '{}');
        let collegeLabel = "";

        if (role === 'principal') {
            collegeLabel = user.collegeName ? ` - ${user.collegeName}` : "";
        } else if ((role === 'teacher' || role === 'supervisor') && user.ownerId) {
            const owner = Storage.getPrincipals().find(p => p.id === user.ownerId);
            if (owner && owner.collegeName) {
                collegeLabel = ` - ${owner.collegeName}`;
            }
        }

        // Filter fees manually as there is no getFees() helper that filters yet, or we create one.
        // Let's rely on Storage.filterByOwner for fees too
        const rawFees = Storage.get().fees || [];
        const fees = Storage.filterByOwner(rawFees);

        const studentsCount = students.length;
        const teachersCount = teachers.length;
        const supervisorsCount = supervisors.length;

        // Calculate Revenue per Month based on FILTERED fees
        const revenueByMonth = {};
        fees.forEach(fee => {
            const month = fee.month || 'Inconnu';
            revenueByMonth[month] = (revenueByMonth[month] || 0) + (parseFloat(fee.amount) || 0);
        });

        // Sort months specifically if possible, otherwise alphabetical or insertion order
        const monthsOrder = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const sortedMonths = Object.keys(revenueByMonth).sort((a, b) => {
            return monthsOrder.indexOf(a) - monthsOrder.indexOf(b);
        });

        const revenueHtml = sortedMonths.map(month => `
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                <span>${month}</span>
                <span style="font-weight: 600; color: #4ade80;">${revenueByMonth[month]} FD</span>
            </div>
        `).join('') || '<p style="color: var(--text-muted);">Aucun revenu enregistré.</p>';

        container.innerHTML = `
            <div class="page-header-area">
                <h3 style="margin: 0;">Tableau de Bord<span style="color: var(--primary); font-weight: normal;">${collegeLabel}</span></h3>
                <div class="user-profile" style="display: flex; gap: 12px; align-items: center;">
                    <button class="btn btn-outline" style="font-size: 12px; padding: 4px 8px;" onclick="UI.triggerMigration()">
                        <i class="ph ph-wrench"></i> Corriger Niveaux
                    </button>
                    ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
            
            <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                <div class="glass-panel animate-enter delay-1">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <i class="ph-fill ph-student" style="font-size: 24px; color: var(--primary);"></i>
                        <h3 style="color: var(--text-muted); font-size: 14px; margin: 0;">Élèves</h3>
                    </div>
                    <p style="font-size: 28px; font-weight: 700;">${studentsCount}</p>
                </div>
                <div class="glass-panel animate-enter delay-2">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <i class="ph-fill ph-chalkboard-teacher" style="font-size: 24px; color: #8b5cf6;"></i>
                        <h3 style="color: var(--text-muted); font-size: 14px; margin: 0;">Enseignants</h3>
                    </div>
                    <p style="font-size: 28px; font-weight: 700;">${teachersCount}</p>
                </div>
                <div class="glass-panel animate-enter delay-3">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <i class="ph-fill ph-users-three" style="font-size: 24px; color: #f59e0b;"></i>
                        <h3 style="color: var(--text-muted); font-size: 14px; margin: 0;">Surveillants</h3>
                    </div>
                    <p style="font-size: 28px; font-weight: 700;">${supervisorsCount}</p>
                </div>
            </div>

            <div class="glass-panel animate-enter delay-4" style="margin-top: 24px;">
                <h3>Revenus par Mois</h3>
                <div style="margin-top: 16px;">
                    ${revenueHtml}
                </div>
            </div>
        `;
    },

    handleClaimData() {
        if (confirm("Êtes-vous sûr de vouloir vous approprier toutes les données existantes ?\\nFaites-le UNIQUEMENT si vous êtes le propriétaire légitime de ces données.")) {
            const userStr = sessionStorage.getItem('edutrack_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const count = Storage.claimLegacyData(user.id);
                alert(`${count} éléments ont été liés à votre compte avec succès.`);
                app.navigate('dashboard'); // Refresh
            }
        }
    },

    renderStudents(container, filterClass = null) {
        let students = Storage.getStudents();
        const role = sessionStorage.getItem('edutrack_role');
        const userStr = sessionStorage.getItem('edutrack_user');

        // Filter for Teachers (Existing logic)
        if (role === 'teacher' && userStr) {
            const teacher = JSON.parse(userStr);
            if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
                students = students.filter(s => {
                    return teacher.assignedClasses.some(c =>
                        c.level === s.level && String(c.division) === String(s.classroom)
                    );
                });
            } else {
                students = [];
            }
        }

        // --- Class Filter Logic ---
        const uniqueClasses = new Set();
        students.forEach(s => {
            if (s.level) {
                const div = s.classroom ? s.classroom : '';
                uniqueClasses.add(JSON.stringify({ level: s.level, classroom: div }));
            }
        });
        const allClasses = Array.from(uniqueClasses).map(c => JSON.parse(c));
        allClasses.sort((a, b) => {
            if (a.level !== b.level) return a.level.localeCompare(b.level);
            return parseInt(a.classroom || 0) - parseInt(b.classroom || 0);
        });

        const showTable = !!filterClass;
        let filteredStudents = [];

        if (showTable) {
            const [fLevel, fClassroom] = filterClass.split('|');
            filteredStudents = students.filter(s =>
                s.level === fLevel && String(s.classroom || '') === String(fClassroom || '')
            );
            // Sort only when showing
            filteredStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
        }
        // --------------------------

        container.innerHTML = `
            <div class="page-header-area">
                <div class="search-box" style="display: flex; gap: 12px; align-items: center;">
                     <select id="student-class-filter" class="form-input" style="width: 250px;" onchange="app.filterStudents(this.value)">
                        <option value="">Sélectionner une classe pour voir les élèves</option>
                        ${allClasses.map(c => {
            const val = `${c.level}|${c.classroom || ''}`;
            const label = `${c.level}${c.classroom || ''}`;
            const isSelected = filterClass === val ? 'selected' : '';
            return `<option value="${val}" ${isSelected}>${label}</option>`;
        }).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 12px;">
                    <input type="file" id="import-file" accept=".xlsx, .xls, .csv" style="display: none;" onchange="app.handleImportStudents(event)">
                    <button class="btn btn-outline" onclick="app.triggerImportStudents()">
                        <i class="ph ph-microsoft-excel-logo"></i>
                        Importer Excel
                    </button>
                    <button class="btn btn-primary" onclick="app.showAddStudentModal()">
                        <i class="ph ph-plus"></i>
                        Nouvel Élève
                    </button>
                </div>
            </div>

            ${!showTable ? `
                <div class="glass-panel animate-enter" style="text-align: center; padding: 60px; color: var(--text-muted);">
                    <i class="ph ph-users-three" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Veuillez sélectionner une classe dans le menu ci-dessus pour afficher la liste des élèves.</p>
                </div>
            ` : `
                <div class="glass-panel table-container animate-enter">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nom & Prénom</th>
                                <th>Niveau / Division</th>
                                <th>Parent (Tél)</th>
                                <th>Adresse</th>
                                <th>Absences Total</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredStudents.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Aucun élève trouvé dans cette classe.</td></tr>' : ''}
                            ${filteredStudents.map(s => {
            const absHours = Storage.getStudentAbsences(s.id);
            return `
                                <tr>
                                    <td>
                                        <div style="font-weight: 600;">${s.lastName} ${s.firstName}</div>
                                        <div style="font-size: 12px; color: var(--text-muted);">ID: ${s.studentId}</div>
                                    </td>
                                    <td><span class="status-badge status-valid">${s.level}${s.classroom || ''}</span></td>
                                    <td>${s.parentPhone}</td>
                                    <td>${s.address}</td>
                                    <td>${absHours > 0 ? `<span style="color: #ef4444; font-weight: 600;">${absHours}h</span>` : '<span style="color: var(--text-muted);">-</span>'}</td>
                                    <td>
                                        <button class="btn-icon" style="width: 32px; height: 32px; color: var(--primary);" onclick="app.showStudentReportCard('${s.id}')" title="Bulletin">
                                            <i class="ph ph-printer"></i>
                                        </button>
                                        <button class="btn-icon" style="width: 32px; height: 32px; color: #f87171;" onclick="app.deleteStudent('${s.id}')" title="Supprimer">
                                            <i class="ph ph-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        `;
    },

    renderAbsences(container) {
        const students = Storage.getStudents();
        const data = Storage.get();
        // Flatten absences to show history or show per student?
        // Let's show a list of absence records + a button to add new one.

        container.innerHTML = `
            <div class="page-header-area">
                <div class="search-box"></div>
                <button class="btn btn-primary" onclick="app.showAddAbsenceModal()">
                    <i class="ph ph-plus"></i>
                    Ajouter Absence
                </button>
            </div>

            <div class="glass-panel table-container animate-enter">
                <h3 style="margin-bottom: 16px;">Historique des Absences</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Élève</th>
                            <th>Heures</th>
                            <th>Motif</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.absences.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-muted);">Aucune absence enregistrée.</td></tr>' : ''}
                        ${data.absences.sort((a, b) => new Date(b.date) - new Date(a.date)).map(abs => {
            const student = students.find(s => s.id === abs.studentId);
            const studentName = student ? `${student.lastName} ${student.firstName}` : 'Élève Inconnu';
            return `
                                <tr>
                                    <td>${abs.date}</td>
                                    <td>${studentName}</td>
                                    <td><span style="font-weight: bold; color: #ef4444;">${abs.hours}h</span></td>
                                    <td>${abs.reason || '-'}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFees(container) {
        container.innerHTML = `
            <div class="page-header-area">
                <h3 style="margin: 0;">Frais Scolaires</h3>
                <div class="search-box"></div>
                <button class="btn btn-primary" onclick="app.showAddFeeModal()">
                    <i class="ph ph-money"></i>
                    Nouveau Paiement
                </button>
            </div>
            
            <div class="glass-panel animate-enter" style="margin-top: 24px; text-align: center; color: var(--text-muted); padding: 40px;">
                <p>Historique masqué.</p>
            </div>
        `;
    },

    renderSubjects(container) {
        const subjects = Storage.getSubjects();
        container.innerHTML = `
            <div class="page-header-area">
                <div class="search-box"></div>
                <button class="btn btn-primary" onclick="app.showAddSubjectModal()">
                    <i class="ph ph-plus"></i>
                    Nouvelle Matière
                </button>
            </div>
            <div class="glass-panel table-container animate-enter">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom de la Matière</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjects.length === 0 ? '<tr><td colspan="2" style="text-align:center;">Aucune matière.</td></tr>' : ''}
                        ${subjects.map(s => `
                            <tr>
                                <td>${s.name}</td>
                                <td>
                                    <button class="btn-icon" onclick="app.deleteSubject('${s.id}')" style="color: #f87171;"><i class="ph ph-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderTeachers(container) {
        const teachers = Storage.getTeachers();
        const subjects = Storage.getSubjects();

        container.innerHTML = `
            <div class="page-header-area">
                <div class="search-box"></div>
                <button class="btn btn-primary" onclick="app.showAddTeacherModal()">
                    <i class="ph ph-plus"></i>
                    Nouveau Professeur
                </button>
            </div>
            <div class="glass-panel table-container animate-enter">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom & Prénom</th>
                            <th>Matière</th>
                            <th>Info. Contact</th>
                            <th>Classes</th>
                            <th>Identification</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teachers.length === 0 ? '<tr><td colspan="6" style="text-align:center;">Aucun professeur.</td></tr>' : ''}
                        ${teachers.map(t => {
            const subj = subjects.find(s => s.id === t.subjectId);
            const classesCount = t.assignedClasses ? t.assignedClasses.length : 0;
            const classesTooltip = t.assignedClasses ? t.assignedClasses.map(c => `${c.level}${c.division || ''}`).join(', ') : '';
            return `
                            <tr>
                                <td>
                                    <div style="font-weight: 600;">${t.lastName} ${t.firstName}</div>
                                    <div style="font-size: 11px; color: var(--text-muted);">${t.sex || '-'}</div>
                                </td>
                                <td><span class="status-badge status-warning">${subj ? subj.name : 'Inconnu'}</span></td>
                                <td>${t.phone || '-'}</td>
                                <td title="${classesTooltip}">
                                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                        ${t.assignedClasses && t.assignedClasses.length > 0
                    ? t.assignedClasses.map(c => `<span class="status-badge status-neutral" style="font-size: 10px;">${c.level}${c.division}</span>`).join('')
                    : '<span style="color: var(--text-muted); font-size: 11px;">Aucune</span>'}
                                    </div>
                                </td>
                                <td>
                                    <div style="font-size: 12px;">Login: <strong>${t.username}</strong></div>
                                    <div style="font-size: 12px;">Mdp: <strong>${t.password}</strong></div>
                                </td>
                                <td>
                                    <button class="btn-icon" onclick="app.resetUserPassword('teacher', '${t.id}')" title="Réinitialiser MDP"><i class="ph ph-arrow-counter-clockwise"></i></button>
                                    <button class="btn-icon" onclick="app.deleteTeacher('${t.id}')" style="color: #f87171;"><i class="ph ph-trash"></i></button>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderGrades(container) {
        const subjects = Storage.getSubjects();
        const students = Storage.getStudents();

        // Extract unique levels and classrooms for filter
        let levels = ["6ème", "5ème", "4ème", "3ème", "Lycée"];
        let classrooms = [...new Set(students.map(s => s.classroom).filter(Boolean))].sort();
        let allowedSubjects = subjects;

        // Teacher Restriction
        const role = sessionStorage.getItem('edutrack_role');
        if (role === 'teacher') {
            const userStr = sessionStorage.getItem('edutrack_user');
            if (userStr) {
                const teacher = JSON.parse(userStr);

                // Restrict Subject
                if (teacher.subjectId) {
                    allowedSubjects = subjects.filter(s => s.id === teacher.subjectId);
                }

                // Restrict Levels and Divisions based on assignment
                // We should only show levels/divisions that the teacher is assigned to
                if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
                    const assignedLevels = [...new Set(teacher.assignedClasses.map(c => c.level))];
                    levels = levels.filter(l => assignedLevels.includes(l));

                    // Note: Filtering divisions here is tricky because it depends on the selected level.
                    // Ideally, we should filter the division dropdown *dynamically* when level changes.
                    // But for now, let's just initial filter or leave all divisions (since selecting a wrong one will show no students).
                    // Better approach: Let app.refreshGradesView handle validation or just show empty list.
                    // For UI cleanliness, let's filter the initial lists if possible.
                }
            }
        }

        // Initial render wrapper
        container.innerHTML = `
            <div class="glass-panel animate-enter" style="margin-bottom: 24px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; align-items: flex-end;">
                    <div id="subject-select-container" style="${role === 'admin' ? 'display:none;' : ''}">
                        <label class="form-label">Matière</label>
                        <select id="grade-subject-select" class="form-input" onchange="app.refreshGradesView()">
                            <option value="">Choisir une matière</option>
                            ${allowedSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Classe</label>
                        <select id="grade-class-select" class="form-input" onchange="app.refreshGradesView()">
                            <option value="">Choisir une classe</option>
                            ${(function () {
                // Dynamically generate options from existing students
                const uniqueClasses = new Set();
                const levels = ["6ème", "5ème", "4ème", "3ème", "Lycée"];

                students.forEach(s => {
                    if (s.level) {
                        const div = s.classroom ? s.classroom : '';
                        uniqueClasses.add(JSON.stringify({ level: s.level, classroom: div }));
                    }
                });

                // Convert Set back to array of objects
                let allOptions = Array.from(uniqueClasses).map(s => JSON.parse(s));

                // Sort
                allOptions.sort((a, b) => {
                    if (a.level !== b.level) return a.level.localeCompare(b.level);
                    return parseInt(a.classroom || 0) - parseInt(b.classroom || 0);
                });

                // Filter for Teachers
                const role = sessionStorage.getItem('edutrack_role');
                if (role === 'teacher') {
                    const userStr = sessionStorage.getItem('edutrack_user');
                    if (userStr) {
                        const teacher = JSON.parse(userStr);
                        if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
                            allOptions = allOptions.filter(opt =>
                                teacher.assignedClasses.some(tc =>
                                    tc.level === opt.level && String(tc.division || '') === String(opt.classroom || '')
                                )
                            );
                        } else {
                            allOptions = [];
                        }
                    }
                }

                if (allOptions.length === 0 && role === 'teacher') {
                    return '<option value="" disabled>Aucune classe assignée</option>';
                }

                return allOptions.map(c => {
                    const val = `${c.level}|${c.classroom}`;
                    const label = `${c.level}${c.classroom || ''}`;
                    return `<option value="${val}">${label}</option>`;
                }).join('');
            })()}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Trimestre</label>
                        <select id="grade-term-select" class="form-input" onchange="app.refreshGradesView()">
                            <option value="Trimestre 1">Trimestre 1</option>
                            <option value="Trimestre 2">Trimestre 2</option>
                            <option value="Trimestre 3">Trimestre 3</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div id="grades-list-container">
                <div style="text-align: center; color: var(--text-muted); padding: 40px;">
                    Veuillez sélectionner une matière et un niveau pour saisir les notes.
                </div>
            </div>
        `;

        // If teacher has only one subject, auto-select it
        if (role === 'teacher' && allowedSubjects.length === 1) {
            const subjSelect = document.getElementById('grade-subject-select');
            if (subjSelect) subjSelect.value = allowedSubjects[0].id;
        }
    },

    renderPrincipalSubjectSummary(containerId, term, level, classroom) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const students = Storage.getStudents().filter(s =>
            s.level === level && (!classroom || String(s.classroom) === String(classroom))
        );

        if (students.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Aucun élève trouvé dans cette classe.</div>';
            return;
        }

        const subjects = Storage.getSubjects();

        // Prepare Data Structure: Grades per Subject per Student
        // We need efficient lookup
        const matrix = {}; // { studentId: { subjectId: average } }
        const subjectAverages = {}; // { subjectId: { sum: 0, count: 0 } }

        subjects.forEach(subj => {
            const grades = Storage.getGrades(subj.id, term);
            subjectAverages[subj.id] = { sum: 0, count: 0 };

            grades.forEach(g => {
                if (!matrix[g.studentId]) matrix[g.studentId] = {};
                matrix[g.studentId][subj.id] = g.average;

                // For Class Avg
                if (students.some(s => s.id === g.studentId)) { // Ensure student is in this class
                    const val = parseFloat(g.average);
                    if (!isNaN(val)) {
                        subjectAverages[subj.id].sum += val;
                        subjectAverages[subj.id].count++;
                    }
                }
            });
        });

        // Calculate Student General Averages (Row)
        students.forEach(s => {
            let sum = 0;
            let count = 0;
            subjects.forEach(subj => {
                const val = parseFloat(matrix[s.id]?.[subj.id]);
                if (!isNaN(val)) {
                    sum += val;
                    count++;
                }
            });
            s.generalAvg = count > 0 ? (sum / count).toFixed(2) : '-';
        });

        // Render Matrix
        let html = `
            <div class="glass-panel table-container" style="overflow-x: auto;">
                <div style="margin-bottom: 16px;">
                    <h3>Bulletin Récapitulatif</h3>
                    <p style="color: var(--text-muted); font-size: 13px;">Classe : ${level}${classroom || ''} - ${term}</p>
                </div>
                <table class="data-table" style="font-size: 13px;">
                    <thead>
                        <tr>
                            <th style="min-width: 150px; position: sticky; left: 0; background: var(--surface); z-index: 10;">Élève</th>
                            ${subjects.map(subj => `
                                <th style="text-align: center; cursor: pointer; color: var(--primary);" 
                                    onclick="app.selectSubjectAndRefresh('${subj.id}')"
                                    title="Voir les détails pour ${subj.name}">
                                    ${subj.name} <i class="ph-bold ph-arrow-right" style="font-size: 10px;"></i>
                                </th>
                            `).join('')}
                            <th style="text-align: center; font-weight: bold;">Moy. Gén.</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        students.forEach(s => {
            html += `
                <tr>
                    <td style="font-weight: 600; position: sticky; left: 0; background: var(--surface);">${s.lastName} ${s.firstName}</td>
                    ${subjects.map(subj => {
                const avg = matrix[s.id]?.[subj.id];
                const val = parseFloat(avg);
                let color = 'var(--text-muted)';
                let weight = '400';

                if (!isNaN(val)) {
                    if (val >= 10) { color = '#4ade80'; weight = '700'; }
                    else if (val >= 8) { color = '#fbbf24'; weight = '700'; }
                    else { color = '#f87171'; weight = '700'; }
                }

                return `<td style="text-align: center; color: ${color}; font-weight: ${weight};">${!isNaN(val) ? avg : '-'}</td>`;
            }).join('')}
                    <td style="text-align: center; font-weight: 800; color: white; background: rgba(255,255,255,0.05);">${s.generalAvg}</td>
                </tr>
            `;
        });

        // Footer Row: Class Averages
        html += `
                <tr style="border-top: 2px solid rgba(255,255,255,0.1);">
                    <td style="font-weight: bold; text-align: right; position: sticky; left: 0; background: var(--surface);">Moyenne Classe</td>
                    ${subjects.map(subj => {
            const data = subjectAverages[subj.id];
            const avg = data.count > 0 ? (data.sum / data.count).toFixed(2) : '-';
            const val = parseFloat(avg);
            let color = 'var(--text-muted)'; // Default grey
            if (!isNaN(val)) {
                if (val >= 10) color = '#4ade80'; // Green
                else if (val >= 8) color = '#fbbf24'; // Orange
                else color = '#f87171'; // Red
            }
            return `<td style="text-align: center; font-weight: bold; color: ${color};">${avg}</td>`;
        }).join('')}
                    <td style="background: rgba(255,255,255,0.05);"></td>
                </tr>
        `;

        html += `   </tbody>
                </table>
            </div>
            <div style="margin-top: 12px; font-size: 12px; color: var(--text-muted); text-align: right;">
                <i class="ph-bold ph-info"></i> Cliquez sur le nom d'une matière pour saisir/voir les notes détaillées.
            </div>
        `;
        container.innerHTML = html;
    },

    renderGradesTable(containerId, subjectId, term, level, classroom) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let students = Storage.getStudents();
        const role = sessionStorage.getItem('edutrack_role');
        const isAdmin = role === 'admin';

        // Filter students
        if (level) {
            students = students.filter(s => s.level === level);
        }
        if (classroom) {
            students = students.filter(s => s.classroom === classroom);
        }

        const existingGrades = Storage.getGrades(subjectId, term); // array of objects

        container.innerHTML = `
            <form onsubmit="app.handleSaveGrades(event)">
                <input type="hidden" name="subjectId" value="${subjectId}">
                <input type="hidden" name="term" value="${term}">
                
                <div class="glass-panel table-container">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center;">
                        <h3>Liste des élèves (${students.length})</h3>
                        ${!isAdmin ? '<button type="submit" class="btn btn-primary">Enregistrer les notes</button>' :
                '<div style="display:flex; gap:12px; align-items:center;">' +
                '<button type="button" class="btn btn-outline" onclick="app.clearSubjectAndRefresh()"><i class="ph ph-arrow-left"></i> Retour au sommaire</button>' +
                '<span class="status-badge status-neutral" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);"><i class="ph ph-lock"></i> Lecture Seule (Principal)</span>' +
                '</div>'}
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Élève</th>
                                <th>Classe</th>
                                <th style="width: 60px;">D1</th>
                                <th style="width: 60px;">D2</th>
                                <th style="width: 60px;">D3</th>
                                <th style="width: 60px;">D4</th>
                                <th style="width: 60px;">D5</th>
                                <th style="width: 80px;">Moyenne</th>
                                <th>Appréciation</th>
                                <th>Compétences</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${students.length === 0 ? '<tr><td colspan="8" style="text-align:center;">Aucun élève trouvé pour ce niveau/division.</td></tr>' : ''}
                            ${students.map(s => {
                    const gradeRecord = existingGrades.find(g => g.studentId === s.id);
                    // Ensure values is an array of 5 elements
                    const values = gradeRecord && Array.isArray(gradeRecord.values)
                        ? gradeRecord.values
                        : (gradeRecord && gradeRecord.value ? [gradeRecord.value, '', '', '', ''] : ['', '', '', '', '']);
                    // Fill up to 5 if partial
                    while (values.length < 5) values.push('');

                    const average = gradeRecord ? gradeRecord.average : '';

                    return `
                                    <tr>
                                        <td>
                                            <div style="font-weight: 600;">${s.lastName} ${s.firstName}</div>
                                        </td>
                                        <td>
                                            <span class="status-badge status-valid">${s.level} ${s.classroom || ''}</span>
                                        </td>
                                        ${values.map((val, idx) => `
                                            <td>
                                                <input type="number" step="0.5" min="0" max="20" 
                                                    name="grade_${s.id}_${idx}" 
                                                    value="${val}" 
                                                    class="form-input" 
                                                    style="width: 50px; padding: 6px; text-align: center; ${isAdmin ? 'background: transparent; border: none; font-weight: bold; color:white;' : ''}"
                                                    oninput="app.calculateRowAverage('${s.id}')"
                                                    ${isAdmin ? 'readonly disabled' : ''}
                                                >
                                            </td>
                                        `).join('')}
                                        <td>
                                            <input type="text" 
                                                id="avg_${s.id}"
                                                name="average_${s.id}"
                                                value="${average}"
                                                readonly
                                                class="form-input"
                                                style="width: 60px; padding: 6px; text-align: center; font-weight: bold; background: rgba(255,255,255,0.1);"
                                            >
                                        </td>
                                        <td>
                                            <input type="text"
                                                name="appreciation_${s.id}"
                                                value="${gradeRecord && gradeRecord.appreciation ? gradeRecord.appreciation : ''}"
                                                class="form-input"
                                                placeholder="Commentaire..."
                                                style="width: 100%; padding: 6px; font-size: 12px; ${isAdmin ? 'background: transparent; border: none; color:white;' : ''}"
                                                ${isAdmin ? 'readonly' : ''}
                                            >
                                        </td>
                                        <td>
                                            <input type="text"
                                                name="competence_${s.id}"
                                                value="${gradeRecord && gradeRecord.competence ? gradeRecord.competence : ''}"
                                                class="form-input"
                                                placeholder="Acquis..."
                                                style="width: 100%; padding: 6px; font-size: 12px; ${isAdmin ? 'background: transparent; border: none; color:white;' : ''}"
                                                ${isAdmin ? 'readonly' : ''}
                                            >
                                        </td>
                                    </tr>
                                `;
                }).join('')}
                        </tbody>
                    </table>
                </div>
            </form>
        `;
    },

    showAddStudentModal() {
        // Implement Modal Logic
        const modalHtml = `
            <div class="glass-panel" style="width: 500px; max-width: 90%; margin: 100px auto; position: relative;">
                <h3 style="margin-bottom: 24px;">Ajouter un nouvel élève</h3>
                <form id="add-student-form" onsubmit="app.handleAddStudent(event)">
                    <div class="form-group">
                        <label class="form-label">Nom et Prénom</label>
                        <input type="text" name="fullName" class="form-input" required placeholder="Ex: Dupont Jean">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Classe (Ex: 6ème 2, 6eme7)</label>
                        <input type="text" name="fullClass" class="form-input" required placeholder="Ex: 6ème 2">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contact Parent</label>
                        <input type="tel" name="parentPhone" class="form-input" required placeholder="Ex: 06 12 34 56 78">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Adresse</label>
                        <input type="text" name="address" class="form-input" required placeholder="Adresse complète">
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 32px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        `;
        this.renderModal(modalHtml);
    },

    showAddAbsenceModal() {
        const students = Storage.getStudents();
        const modalHtml = `
            <div class="glass-panel" style="width: 450px; max-width: 90%; margin: 100px auto; position: relative;">
                <h3 style="margin-bottom: 24px;">Ajouter une Absence</h3>
                <form onsubmit="app.handleAddAbsence(event)">
                    <div class="form-group">
                        <label class="form-label">Élève</label>
                        <select name="studentId" class="form-input" required style="background: rgba(0,0,0,0.2); color:white;">
                            <option value="">Sélectionner un élève</option>
                            ${students.map(s => `<option value="${s.id}">${s.lastName} ${s.firstName} (${s.studentId})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" name="date" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre d'heures</label>
                        <input type="number" name="hours" class="form-input" required min="1" placeholder="Ex: 2">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Motif</label>
                        <input type="text" name="reason" class="form-input" placeholder="Ex: Maladie, RDV...">
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 32px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        `;
        this.renderModal(modalHtml);
    },

    showAddFeeModal() {
        const students = Storage.getStudents();
        const modalHtml = `
            <div class="glass-panel" style="width: 450px; max-width: 90%; margin: 100px auto; position: relative;">
                <h3 style="margin-bottom: 24px;">Enregistrer un Paiement</h3>
                <form onsubmit="app.handleAddFee(event)">
                    <div class="form-group">
                        <label class="form-label">Élève</label>
                        <select name="studentId" class="form-input" required style="background: rgba(0,0,0,0.2); color:white;">
                            <option value="">Sélectionner un élève</option>
                            ${students.map(s => `<option value="${s.id}">${s.lastName} ${s.firstName} (${s.studentId})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Mois Concerné</label>
                        <select name="month" class="form-input" required style="background: rgba(0,0,0,0.2); color:white;">
                            <option value="Septembre">Septembre</option>
                            <option value="Octobre">Octobre</option>
                            <option value="Novembre">Novembre</option>
                            <option value="Décembre">Décembre</option>
                            <option value="Janvier">Janvier</option>
                            <option value="Février">Février</option>
                            <option value="Mars">Mars</option>
                            <option value="Avril">Avril</option>
                            <option value="Mai">Mai</option>
                            <option value="Juin">Juin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Montant (FD)</label>
                        <input type="number" name="amount" class="form-input" required value="15000" placeholder="15000">
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Le montant doit être exactement 15000 FD.</p>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 32px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        `;
        this.renderModal(modalHtml);
    },

    showAddSubjectModal() {
        const modalHtml = `
            <div class="glass-panel" style="width: 400px; max-width: 90%; margin: 100px auto;">
                <h3 style="margin-bottom: 24px;">Nouvelle Matière</h3>
                <form onsubmit="app.handleAddSubject(event)">
                    <div class="form-group">
                        <label class="form-label">Nom de la matière</label>
                        <input type="text" name="name" class="form-input" required placeholder="Ex: Mathématiques">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 32px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Ajouter</button>
                    </div>
                </form>
            </div>
        `;
        this.renderModal(modalHtml);
    },

    showAddTeacherModal() {
        const subjects = Storage.getSubjects();
        const modalHtml = `
            <div class="glass-panel" style="width: 600px; max-width: 90%; margin: 50px auto; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-bottom: 24px;">Nouveau Professeur</h3>
                <form onsubmit="app.handleAddTeacher(event)">
                    <div class="form-group">
                        <label class="form-label">Nom et Prénom</label>
                        <input type="text" name="fullName" class="form-input" required placeholder="Ex: Ali Mohamed">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Sexe</label>
                            <select name="sex" class="form-input" style="background: rgba(0,0,0,0.2); color:white;">
                                <option value="H">Homme</option>
                                <option value="F">Femme</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Téléphone</label>
                            <input type="tel" name="phone" class="form-input" placeholder="Ex: 77 12 34 56">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Matière Enseignée</label>
                        <select name="subjectId" class="form-input" required style="background: rgba(0,0,0,0.2); color:white;">
                            <option value="">Choisir une matière</option>
                            ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <label class="form-label" style="margin-bottom: 8px;">Classes Enseignées</label>
                        <div id="teacher-classes-container">
                            <!-- Rows will be added here -->
                        </div>
                        <button type="button" class="btn btn-outline" style="font-size: 12px; margin-top: 8px;" onclick="app.addTeacherClassRow()">
                            <i class="ph ph-plus"></i> Ajouter une classe
                        </button>
                    </div>

                    <div style="display: flex; gap: 12px; margin-top: 32px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer & Générer Accès</button>
                    </div>
                </form>
            </div>
        `;
        this.renderModal(modalHtml);
        // Add first row by default
        setTimeout(() => app.addTeacherClassRow(), 100);
    },

    renderModal(htmlContent) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        container.innerHTML = htmlContent;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex-center');
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'flex-start';
        overlay.style.justifyContent = 'center';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.zIndex = '1000';
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
        const container = document.getElementById('modal-container');
        if (container) container.innerHTML = '';
    },

    renderPrincipals(container) {
        const principals = Storage.getPrincipals();

        container.innerHTML = `
            <div class="page-header-area">
                <div class="search-box"></div>
                <button class="btn btn-primary" onclick="app.showAddPrincipalModal()">
                    <i class="ph ph-plus"></i>
                    Nouveau Principal
                </button>
            </div>
            
            <div class="glass-panel table-container animate-enter">
                <h3 style="margin-bottom: 16px;">Liste des Principaux</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom & Prénom</th>
                            <th>Collège</th>
                            <th>Identifiant</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${principals.length === 0 ? '<tr><td colspan="4" style="text-align:center;">Aucun principal enregistré.</td></tr>' : ''}
                        ${principals.map(p => `
                            <tr>
                                <td>${p.firstName} ${p.lastName}</td>
                                <td>${p.collegeName || '-'}</td>
                                <td>
                                    <div style="font-size: 12px;">Login: <strong>${p.username}</strong></div>
                                    <div style="font-size: 12px;">Mdp: <strong>${p.password}</strong></div>
                                </td>
                                <td>
                                    <button class="btn-icon" onclick="app.resetUserPassword('principal', '${p.id}')" title="Réinitialiser MDP"><i class="ph ph-arrow-counter-clockwise"></i></button>
                                    <button class="btn-icon" onclick="app.deletePrincipal('${p.id}')" style="color: #f87171;"><i class="ph ph-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Auth Helper
    checkAuth() {
        const isAuth = sessionStorage.getItem('edutrack_auth') === 'true';
        const role = sessionStorage.getItem('edutrack_role');
        const user = JSON.parse(sessionStorage.getItem('edutrack_user') || '{}');

        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');
        const navItems = document.querySelectorAll('.nav-item');
        const avatarContainer = document.getElementById('sidebar-user-avatar');

        // Helper to update Sidebar Avatar
        const updateAvatar = () => {
            if (avatarContainer) {
                if (user.avatar) {
                    avatarContainer.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    avatarContainer.innerHTML = `<i class="ph ph-user"></i>`;
                }
            }
        };

        if (isAuth) {
            if (loginScreen) loginScreen.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');

            // 1. Reset all nav items to hidden first
            navItems.forEach(el => el.style.display = 'none');

            // 2. Show based on role
            if (role === 'superadmin') {
                const principalBtn = document.querySelector(`button[onclick="app.navigate('principals')"]`);
                if (principalBtn) principalBtn.style.display = '';

                const userp = document.querySelector('.user-profile .name');
                if (userp) userp.innerText = 'Administrateur (Super)';
                // Admin avatar (default or stored if we allowed admin storage)
                if (avatarContainer) avatarContainer.innerHTML = `<i class="ph ph-user"></i>`;

            } else if (role === 'principal') {
                const schoolMenus = ['dashboard', 'students', 'absences', 'fees', 'subjects', 'teachers', 'supervisors', 'grades'];
                schoolMenus.forEach(view => {
                    const btn = document.querySelector(`button[onclick="app.navigate('${view}')"]`);
                    if (btn) btn.style.display = '';
                });

                const userp = document.querySelector('.user-profile .name');
                if (userp) userp.innerText = `Principal ${user.lastName || ''}`;
                updateAvatar();

            } else if (role === 'supervisor') {
                const srvMenus = ['absences'];
                srvMenus.forEach(view => {
                    const btn = document.querySelector(`button[onclick="app.navigate('${view}')"]`);
                    if (btn) btn.style.display = '';
                });

                const userp = document.querySelector('.user-profile .name');
                if (userp) userp.innerText = `Srv. ${user.lastName || ''}`;
                updateAvatar();

            } else if (role === 'teacher') {
                const teacherMenus = ['grades'];
                teacherMenus.forEach(view => {
                    const btn = document.querySelector(`button[onclick="app.navigate('${view}')"]`);
                    if (btn) btn.style.display = '';
                });

                const userp = document.querySelector('.user-profile .name');
                if (userp) userp.innerText = `Prof. ${user.lastName || ''}`;
                updateAvatar();
            }

        } else {
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (appContainer) appContainer.classList.add('hidden');
        }
    },

    showStudentReportCard(studentId) {
        const student = Storage.getStudents().find(s => s.id === studentId);
        if (!student) return;

        // Determine active term (simple selector or default)
        // For now, let's ask the user or default to "Trimestre 1" if complex.
        // Or simpler: Show a small modal to pick term, THEN show report.
        // Let's just show Term 1 by default, or better, show the report with a select inside it?
        // Printing needs static content. Let's PICK the current term.
        // Using a prompt for simplicity or standard T1. Assuming T1 for demo unless we add a selector.
        // Let's add a robust Term Selector in the modal itself before generating the view?
        // No, let's just show "Trimestre 1" initially and allow switching in the modal (swapping HTML).

        let term = "Trimestre 1";
        this.renderReportCardModal(student, term);
    },

    renderReportCardModal(student, term) {
        // ... (Keep existing implementation logic) ...
        // --- 1. Gather Context Data for Statistics ---
        const allStudents = Storage.getStudents();
        // Filter students in the SAME class (Level + Classroom)
        const classStudents = allStudents.filter(s =>
            s.level === student.level &&
            String(s.classroom || '') === String(student.classroom || '')
        );

        const subjects = Storage.getSubjects();

        // Data Structures for Stats
        // subjectStats[subjId] = { scores: [val, val...], sum: 0, avg: 0 }
        const subjectStats = {};
        // studentAverages = [ { studentId, avg } ]
        const studentAverages = [];

        // Initialize Subject Stats
        subjects.forEach(subj => {
            subjectStats[subj.id] = { scores: [] };
        });

        // Loop through ALL students in class to build benchmarks
        classStudents.forEach(s => {
            let studentTotal = 0;
            let studentCoeff = 0;

            subjects.forEach(subj => {
                // Get grade for this student & subject
                // Note: Optimization - Storage.getGrades gets ALL grades for a subject/term.
                // It might be better to fetch once outside, but typical dataset size allows this.
                const gradesList = Storage.getGrades(subj.id, term);
                const g = gradesList.find(x => x.studentId === s.id);

                if (g && g.average) {
                    const val = parseFloat(g.average);
                    if (!isNaN(val)) {
                        subjectStats[subj.id].scores.push(val);
                        studentTotal += val;
                        studentCoeff++;
                    }
                }
            });

            if (studentCoeff > 0) {
                const genAvg = studentTotal / studentCoeff;
                studentAverages.push({ studentId: s.id, val: genAvg });
            }
        });

        // Calculate Class Averages per Subject & Sort for Ranking
        subjects.forEach(subj => {
            const data = subjectStats[subj.id];
            if (data.scores.length > 0) {
                const sum = data.scores.reduce((a, b) => a + b, 0);
                data.avg = sum / data.scores.length;
                // Sort descending for ranking
                data.scores.sort((a, b) => b - a);
            } else {
                data.avg = NaN;
            }
        });

        // Calculate Class General Average & Sort for Ranking
        let classGeneralAvg = "-";
        if (studentAverages.length > 0) {
            const totalGen = studentAverages.reduce((a, b) => a + b.val, 0);
            classGeneralAvg = (totalGen / studentAverages.length).toFixed(2);
            studentAverages.sort((a, b) => b.val - a.val);
        }

        // --- 2. Build Report Data for THIS Student ---
        const reportData = [];
        let totalSum = 0;
        let totalCoeff = 0;

        subjects.forEach(subj => {
            const gradesList = Storage.getGrades(subj.id, term);
            const g = gradesList.find(x => x.studentId === student.id);
            const avg = g ? parseFloat(g.average) : NaN;

            // Statistics
            const classAvg = !isNaN(subjectStats[subj.id].avg) ? subjectStats[subj.id].avg.toFixed(2) : "-";

            let rank = "-";
            let rankSuffix = "";
            let totalRanked = subjectStats[subj.id].scores.length;

            if (!isNaN(avg)) {
                // Find rank
                const r = subjectStats[subj.id].scores.findIndex(v => Math.abs(v - avg) < 0.001) + 1;
                rank = r > 0 ? r : "-";
                rankSuffix = (rank === 1) ? "er" : "ème";
            }

            reportData.push({
                subject: subj.name,
                grades: g ? (g.values || []).filter(v => v !== "").join(", ") : "-",
                average: !isNaN(avg) ? avg.toFixed(2) : "-",
                classAvg: classAvg,
                classAvg: classAvg,
                rank: rank !== "-" ? `${rank}<sup style="font-size:10px">${rankSuffix}</sup>/${totalRanked}` : "-",
                appreciation: g ? (g.appreciation || "") : "",
                competence: g ? (g.competence || "-") : "-"
            });

            if (!isNaN(avg)) {
                totalSum += avg;
                totalCoeff += 1;
            }
        });

        const generalAvg = totalCoeff > 0 ? (totalSum / totalCoeff).toFixed(2) : "-";

        // Student General Rank
        let generalRank = "-";
        let generalRankSuffix = "";
        // let totalStudentsRanked = studentAverages.length; // Unused variable

        if (generalAvg !== "-") {
            const myVal = parseFloat(generalAvg);
            // Search by value to allow ties (e.g. if two students have 15.00, both are ranked X)
            const r = studentAverages.findIndex(x => Math.abs(x.val - myVal) < 0.001) + 1;

            if (r > 0) {
                generalRank = r;
                generalRankSuffix = (r === 1) ? "er" : "ème";
            }
        }


        // HTML Template
        const html = `
             <div class="glass-panel" style="width: 800px; max-width: 95%; margin: 20px auto; color: var(--text-main); position: relative;">
                 <div class="no-print" style="position: absolute; right: 20px; top: 20px; display: flex; gap: 10px;">
                     <select id="report-term-select" class="form-input" style="width: 150px; padding: 6px;" onchange="app.switchReportTerm('${student.id}', this.value)">
                         <option value="Trimestre 1" ${term === 'Trimestre 1' ? 'selected' : ''}>Trimestre 1</option>
                         <option value="Trimestre 2" ${term === 'Trimestre 2' ? 'selected' : ''}>Trimestre 2</option>
                         <option value="Trimestre 3" ${term === 'Trimestre 3' ? 'selected' : ''}>Trimestre 3</option>
                     </select>
                     <button class="btn btn-primary" onclick="window.print()">
                         <i class="ph ph-printer"></i> Imprimer
                     </button>
                     <button class="btn btn-outline" onclick="app.closeModal()">Fermer</button>
                 </div>
 
                 <div id="report-card-content" style="background: white; color: black; padding: 40px; border-radius: 4px;">
                     <!-- Header -->
                     <div style="border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
                         <div>
                             <h2 style="margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase;">Ecole Privée Baraka</h2>
                             <p style="margin: 4px 0 0 0; font-size: 14px;">Année Scolaire 2024 - 2025</p>
                         </div>
                         <div style="text-align: right;">
                             <h3 style="margin: 0; font-size: 18px;">BULLETIN DE NOTES</h3>
                             <p style="margin: 4px 0 0 0; font-weight: bold; font-size: 16px;">${term}</p>
                         </div>
                     </div>
 
                     <!-- Student Info -->
                     <div style="margin-bottom: 30px; padding: 10px; border: 1px solid black; background: #f9f9f9;">
                         <table style="width: 100%; border: none;">
                             <tr style="border: none !important;">
                                 <td style="border: none !important; padding: 4px;"><strong>Nom & Prénom :</strong> ${student.lastName} ${student.firstName}</td>
                                 <td style="border: none !important; padding: 4px; text-align: right;"><strong>Classe :</strong> ${student.level} ${student.classroom || ''}</td>
                             </tr>
                             <tr style="border: none !important;">
                                 <td style="border: none !important; padding: 4px;"><strong>Matricule :</strong> ${student.studentId}</td>
                                 <td style="border: none !important; padding: 4px; text-align: right;"><strong>Élèves dans la classe :</strong> ${allStudents.filter(s => s.level === student.level && s.classroom === student.classroom).length}</td>
                             </tr>
                         </table>
                     </div>
 
                     <!-- Grades Table -->
                     <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
                         <thead>
                             <tr style="background: #eee;">
                                 <th style="border: 1px solid black; padding: 8px; text-align: left;">Matière</th>
                                 <th style="border: 1px solid black; padding: 8px; text-align: center; width: 60px;">Moy.</th>
                                 <th style="border: 1px solid black; padding: 8px; text-align: center; width: 60px; background: #f0f0f0;">Moy. Classe</th>
                                 <th style="border: 1px solid black; padding: 8px; text-align: center; width: 80px;">Rang</th>
                                 <th style="border: 1px solid black; padding: 8px; text-align: left; width: 140px;">Appréciation</th>
                                 <th style="border: 1px solid black; padding: 8px; text-align: left; width: 100px;">Compétences</th>
                             </tr>
                         </thead>
                         <tbody>
                             ${reportData.map(d => `
                                 <tr>
                                     <td style="border: 1px solid black; padding: 8px; font-weight: 500;">${d.subject}</td>
                                     <td style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">${d.average}</td>
                                     <td style="border: 1px solid black; padding: 8px; text-align: center; color: #555; background: #fafafa;">${d.classAvg}</td>
                                     <td style="border: 1px solid black; padding: 8px; text-align: center;">${d.rank}</td>
                                     <td style="border: 1px solid black; padding: 8px; font-size: 12px;">${d.appreciation}</td>
                                     <td style="border: 1px solid black; padding: 8px; font-size: 12px;">${d.competence}</td>
                                 </tr>
                             `).join('')}
                         </tbody>
                         <tfoot>
                             <tr style="border-top: 2px solid black;">
                                 <td colspan="5" style="height: 10px; border: none;"></td>
                             </tr>
                             <tr style="">
                                 <td style="border: 1px solid black; padding: 8px; font-weight: bold; text-align: right;">MOYENNE GÉNÉRALE</td>
                                 <td style="border: 1px solid black; padding: 8px; text-align: center; font-weight: 800; font-size: 16px;">${generalAvg}</td>
                                 <td style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; background: #fafafa; color: #555;">${classGeneralAvg}</td>
                                 <td style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">${generalRank !== "-" ? `${generalRank}<sup style="font-size:10px">${generalRankSuffix}</sup>` : "-"}</td>
                                 <td style="border: 1px solid black; padding: 8px;"></td>
                                 <td style="border: 1px solid black; padding: 8px;"></td>
                             </tr>
                         </tfoot>
                     </table>
 
                      <!-- Footer Signatures -->
                     <div style="display: flex; justify-content: space-between; margin-top: 40px;">
                         <div style="text-align: center; width: 200px;">
                             <p style="margin-bottom: 50px; font-weight: bold; text-decoration: underline;">Signature des Parents</p>
                         </div>
                         <div style="text-align: center; width: 200px;">
                             <p style="margin-bottom: 50px; font-weight: bold; text-decoration: underline;">Le Directeur</p>
                         </div>
                     </div>
                     
                     <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; text-align: center; color: #777;">
                         Bulletin généré le ${new Date().toLocaleDateString()} via EduTrack - Système de Gestion Scolaire
                     </div>
                 </div>
             </div>
         `;

        this.renderModal(html);
    },

    showProfile() {
        // 1. Get User Data
        const role = sessionStorage.getItem('edutrack_role');
        const user = JSON.parse(sessionStorage.getItem('edutrack_user') || '{}');

        let userName = "Administrateur";
        let userRole = "Super Admin";
        let workplace = "Administration Centrale";
        let avatarSrc = null;

        if (role === 'principal') {
            userName = `${user.lastName} ${user.firstName}`;
            userRole = "Directeur / Principal";
            workplace = user.collegeName || "Ecole Privée Baraka";
            avatarSrc = user.avatar;
        } else if (role === 'teacher') {
            userName = `Prof. ${user.lastName} ${user.firstName}`;
            userRole = "Professeur";

            // Find College
            const owner = Storage.getPrincipals().find(p => p.id === user.ownerId);
            workplace = owner ? (owner.collegeName || "Ecole Privée Baraka") : "Ecole Privée Baraka";

            avatarSrc = user.avatar;
        } else if (role === 'supervisor') {
            userName = `${user.lastName} ${user.firstName}`;
            userRole = "Surveillant";

            // Find College
            const owner = Storage.getPrincipals().find(p => p.id === user.ownerId);
            workplace = owner ? (owner.collegeName || "Ecole Privée Baraka") : "Ecole Privée Baraka";

            avatarSrc = user.avatar;
        }

        const html = `
            <div class="glass-panel" style="width: 700px; max-width: 95%; margin: 50px auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin: 0;">Mon Profil Utilisateur</h3>
                    <button class="btn-icon" onclick="app.closeModal()"><i class="ph ph-x"></i></button>
                </div>

                <div class="profile-modal-content">
                    <!-- Left Sidebar -->
                    <div class="profile-sidebar">
                        <label for="avatar-input" class="profile-avatar-upload" title="Changer la photo">
                            ${avatarSrc
                ? `<img src="${avatarSrc}" id="profile-avatar-preview" alt="Avatar">`
                : `<i class="ph ph-camera" id="profile-avatar-icon"></i>`
            }
                            <img id="profile-avatar-img-tag" style="display:none; width:100%; height:100%; object-fit:cover;">
                            <div class="profile-avatar-overlay">
                                <i class="ph ph-pencil-simple" style="font-size: 24px; color: white;"></i>
                            </div>
                        </label>
                        <input type="file" id="avatar-input" accept="image/*" style="display: none;" onchange="app.handleAvatarSelect(event)">
                        
                        <div class="profile-name">${userName}</div>
                        <div class="profile-role">${userRole}</div>
                        <div class="profile-college">
                            <i class="ph ph-buildings"></i> ${workplace}
                        </div>

                        <div style="width: 100%; margin-top: 24px; display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-outline" id="tab-btn-info" onclick="app.switchProfileTab('info')" style="width: 100%; text-align: left; justify-content: flex-start; background: rgba(255,255,255,0.1);">
                                <i class="ph ph-info"></i> Informations
                            </button>
                            <button class="btn btn-outline" id="tab-btn-security" onclick="app.switchProfileTab('security')" style="width: 100%; text-align: left; justify-content: flex-start; border-color: transparent;">
                                <i class="ph ph-lock-key"></i> Sécurité
                            </button>
                        </div>

                        <button class="btn btn-outline" style="width: 100%; margin-top: auto;" onclick="app.logout()">
                            <i class="ph ph-sign-out"></i> Déconnexion
                        </button>
                    </div>

                    <!-- Main Content -->
                    <div class="profile-main">
                        
                        <!-- Tab: Info -->
                        <div id="tab-content-info">
                            <div class="section-title">Informations Générales</div>
                            <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Statut du compte</p>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="status-badge status-valid">Actif</span>
                                    <span style="font-size: 13px;">Connecté en tant que <strong>${userRole}</strong></span>
                                </div>
                            </div>
                            
                            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">
                                Bienvenue sur votre espace personnel. Vous pouvez mettre à jour votre photo de profil en cliquant sur l'avatar à gauche.
                                <br><br>
                                Pour modifier votre mot de passe, veuillez accéder à l'onglet <strong>Sécurité</strong>.
                            </p>
                        </div>

                        <!-- Tab: Security (Hidden by default) -->
                        <div id="tab-content-security" style="display: none;">
                            <div class="section-title">Sécurité & Connexion</div>
                            <form id="password-change-form" onsubmit="app.handlePasswordChange(event)">
                                <div class="form-group">
                                    <label class="form-label">Ancien mot de passe</label>
                                    <input type="password" name="oldPassword" class="form-input" required placeholder="••••••">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Nouveau mot de passe</label>
                                    <input type="password" name="newPassword" class="form-input" required placeholder="••••••" minlength="4">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Confirmer le nouveau mot de passe</label>
                                    <input type="password" name="confirmPassword" class="form-input" required placeholder="••••••" minlength="4">
                                </div>
                                <div style="text-align: right; margin-top: 16px;">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="ph ph-check"></i> Mettre à jour
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        `;

        this.renderModal(html);
    },

    switchProfileTab(tabName) {
        // Buttons
        const btnInfo = document.getElementById('tab-btn-info');
        const btnSec = document.getElementById('tab-btn-security');

        // Content
        const contentInfo = document.getElementById('tab-content-info');
        const contentSec = document.getElementById('tab-content-security');

        if (tabName === 'info') {
            contentInfo.style.display = 'block';
            contentSec.style.display = 'none';

            btnInfo.style.background = 'rgba(255,255,255,0.1)';
            btnInfo.style.borderColor = 'rgba(255,255,255,0.2)';

            btnSec.style.background = 'transparent';
            btnSec.style.borderColor = 'transparent';
        } else {
            contentInfo.style.display = 'none';
            contentSec.style.display = 'block';

            btnSec.style.background = 'rgba(255,255,255,0.1)';
            btnSec.style.borderColor = 'rgba(255,255,255,0.2)';

            btnInfo.style.background = 'transparent';
            btnInfo.style.borderColor = 'transparent';
        }
    }
};

const app = {
    // ... Existing properties ...
    currentAvatarBase64: null,

    handleAvatarSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validation (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("L'image est trop volumineuse. Max 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            this.currentAvatarBase64 = base64; // Store temporarily

            // Update Preview in Modal
            const preview = document.getElementById('profile-avatar-preview');
            const icon = document.getElementById('profile-avatar-icon');
            const imgTag = document.getElementById('profile-avatar-img-tag');

            if (preview) {
                preview.src = base64;
            } else if (imgTag) {
                // If it was an icon before, show the img tag now
                if (icon) icon.style.display = 'none';
                imgTag.src = base64;
                imgTag.style.display = 'block';
                imgTag.id = 'profile-avatar-preview'; // Assign ID for next time
            }

            // Auto-save avatar (UX decision: save immediately or wait for explicit save? Prompt implies "puiise changer... n'importe quand")
            // Let's save immediately for smoother experience
            this.saveAvatarUpdate(base64);
        };
        reader.readAsDataURL(file);
    },

    saveAvatarUpdate(base64) {
        const role = sessionStorage.getItem('edutrack_role');
        const user = JSON.parse(sessionStorage.getItem('edutrack_user') || '{}');

        if (role === 'superadmin') return; // Admin has no storage record currently

        user.avatar = base64;
        sessionStorage.setItem('edutrack_user', JSON.stringify(user));

        // Update Persistent Storage
        this.updateUserInStorage(role, user.id, { avatar: base64 });

        // Update Sidebar
        this.updateSidebarAvatar(base64);
    },

    updateSidebarAvatar(src) {
        const container = document.getElementById('sidebar-user-avatar');
        if (container && src) {
            container.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover;">`;
        }
    },

    handlePasswordChange(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const oldPassword = formData.get('oldPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        const role = sessionStorage.getItem('edutrack_role');
        const user = JSON.parse(sessionStorage.getItem('edutrack_user') || '{}');

        // 1. Validate Match
        if (newPassword !== confirmPassword) {
            alert("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }

        // 2. Validate Old Password
        // Note: For real security, we should check against DB. Here we check against Session which mirrors DB.
        // Or fetch fresh from DB.
        if (user.password !== oldPassword) {
            alert("L'ancien mot de passe est incorrect.");
            return;
        }

        // 3. Update
        user.password = newPassword;
        sessionStorage.setItem('edutrack_user', JSON.stringify(user)); // Update session

        this.updateUserInStorage(role, user.id, { password: newPassword });

        alert("Mot de passe modifié avec succès !");
        e.target.reset();
    },

    updateUserInStorage(role, id, updates) {
        const data = Storage.get();
        let collection = null;

        if (role === 'principal') collection = data.principals;
        else if (role === 'teacher') collection = data.teachers;
        else if (role === 'supervisor') collection = data.supervisors;

        if (collection) {
            const idx = collection.findIndex(u => u.id === id);
            if (idx !== -1) {
                // Merge updates
                collection[idx] = { ...collection[idx], ...updates };
                Storage.save(data);
            }
        }
    },

    // Wrapper for UI methods
    showProfile: () => UI.showProfile(),
    switchProfileTab: (tab) => UI.switchProfileTab(tab),
    logout: () => {
        if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
            sessionStorage.removeItem('edutrack_auth');
            sessionStorage.removeItem('edutrack_role');
            sessionStorage.removeItem('edutrack_user');
            window.location.reload();
        }
    },

    init() {
        Storage.migrateData();
        UI.checkAuth();
        // If auth is strictly required, we might not even need to navigate if not auth
        if (sessionStorage.getItem('edutrack_auth') === 'true') {
            const role = sessionStorage.getItem('edutrack_role');
            if (role === 'teacher') {
                UI.navigate('grades');
            } else if (role === 'supervisor') {
                UI.navigate('absences');
            } else {
                UI.navigate('dashboard');
            }
        }
    },

    navigate: (view) => UI.navigate(view),

    // Supervisors Management
    renderSupervisors(container) {
        const supervisors = Storage.getSupervisors();

        container.innerHTML = `
            <div class="page-header-area">
                <div class="search-box"></div>
                <button class="btn btn-primary" onclick="app.showAddSupervisorModal()">
                    <i class="ph ph-plus"></i>
                    Nouveau Surveillant
                </button>
            </div>
            
            <div class="glass-panel table-container animate-enter">
                <h3 style="margin-bottom: 16px;">Liste des Surveillants</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom & Prénom</th>
                            <th>Téléphone</th>
                            <th>Identifiant</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${supervisors.length === 0 ? '<tr><td colspan="4" style="text-align:center;">Aucun surveillant enregistré.</td></tr>' : ''}
                        ${supervisors.map(s => `
                            <tr>
                                <td>${s.lastName} ${s.firstName}</td>
                                <td>${s.phone || '-'}</td>
                                <td>
                                    <div style="font-size: 12px;">Login: <strong>${s.username}</strong></div>
                                    <div style="font-size: 12px;">Mdp: <strong>${s.password}</strong></div>
                                </td>
                                <td>
                                    <button class="btn-icon" onclick="app.resetUserPassword('supervisor', '${s.id}')" title="Réinitialiser MDP"><i class="ph ph-arrow-counter-clockwise"></i></button>
                                    <button class="btn-icon" onclick="app.deleteSupervisor('${s.id}')" style="color: #f87171;"><i class="ph ph-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    resetUserPassword(role, id) {
        const newPass = prompt("Entrez le nouveau mot de passe pour cet utilisateur :");
        if (newPass) {
            app.updateUserInStorage(role, id, { password: newPass });
            alert("Mot de passe mis à jour avec succès.");

            // Refresh view
            if (role === 'principal') app.navigate('principals');
            else if (role === 'teacher') app.navigate('teachers');
            else if (role === 'supervisor') app.navigate('supervisors');
        }
    },

    showAddSupervisorModal() {
        const html = `
            <div class="glass-panel" style="width: 400px; max-width: 90%; margin: 100px auto;">
                <h3 style="margin-bottom: 24px;">Ajouter un Surveillant</h3>
                <form onsubmit="app.handleAddSupervisor(event)">
                    <div class="form-group">
                        <label class="form-label">Prénom</label>
                        <input type="text" name="firstName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nom</label>
                        <input type="text" name="lastName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Téléphone</label>
                        <input type="text" name="phone" class="form-input">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Créer</button>
                    </div>
                </form>
            </div>
        `;
        UI.renderModal(html);
    },

    handleAddSupervisor(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const phone = formData.get('phone');

        // Generate with prefix 'srv.'
        const creds = app.generateCredentials(lastName, firstName, 'srv.');

        const supervisor = {
            firstName,
            lastName,
            phone,
            username: creds.username,
            password: creds.password
        };

        Storage.addSupervisor(supervisor);
        UI.closeModal();
        app.navigate('supervisors');
    },

    deleteSupervisor(id) {
        if (confirm('Supprimer ce surveillant ?')) {
            Storage.deleteSupervisor(id);
            this.navigate('supervisors');
        }
    },

    showAddStudentModal: () => UI.showAddStudentModal(),
    showAddAbsenceModal: () => UI.showAddAbsenceModal(),
    showAddFeeModal: () => UI.showAddFeeModal(),
    showAddSubjectModal: () => UI.showAddSubjectModal(),
    showAddTeacherModal: () => UI.showAddTeacherModal(),
    showStudentReportCard: (id) => UI.showStudentReportCard(id),

    showAddPrincipalModal() {
        const html = `
            <div class="glass-panel" style="width: 400px; max-width: 90%; margin: 100px auto;">
                <h3 style="margin-bottom: 24px;">Ajouter un Principal</h3>
                <form onsubmit="app.handleAddPrincipal(event)">
                    <div class="form-group">
                        <label class="form-label">Prénom</label>
                        <input type="text" name="firstName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nom</label>
                        <input type="text" name="lastName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nom du Collège</label>
                        <input type="text" name="collegeName" class="form-input" placeholder="Ex: Collège A" required>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Annuler</button>
                        <button type="submit" class="btn btn-primary">Créer</button>
                    </div>
                </form>
            </div>
        `;
        UI.renderModal(html);
    },

    handleAddPrincipal(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const collegeName = formData.get('collegeName');

        const creds = app.generateCredentials(lastName, firstName, 'prin.');

        const principal = {
            firstName,
            lastName,
            collegeName,
            username: creds.username,
            password: creds.password
        };

        Storage.addPrincipal(principal);
        UI.closeModal();
        app.navigate('principals');
    },

    filterStudents(classValue) {
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            UI.renderStudents(contentArea, classValue);
        }
    },

    // Dynamic Division Filter for Teachers
    updateGradeDivisions() {
        const role = sessionStorage.getItem('edutrack_role');
        if (role !== 'teacher') return;

        const levelSelect = document.getElementById('grade-level-select');
        const divisionSelect = document.getElementById('grade-class-select');
        if (!levelSelect || !divisionSelect) return;

        const selectedLevel = levelSelect.value;
        const userStr = sessionStorage.getItem('edutrack_user');
        if (!userStr) return;

        const teacher = JSON.parse(userStr);
        if (!teacher.assignedClasses) return;

        // Get allowed divisions for this level
        const allowedDivisions = teacher.assignedClasses
            .filter(c => c.level === selectedLevel)
            .map(c => c.division);

        // Update options
        // First option is always "Toutes" or "Choisir" - but for strict teacher they should probably choose one
        // Let's keep the first empty option
        Array.from(divisionSelect.options).forEach(opt => {
            if (opt.value === "") return; // keep default
            if (allowedDivisions.includes(opt.value)) {
                opt.style.display = '';
                opt.disabled = false;
            } else {
                opt.style.display = 'none'; // Hide unauthorized
                opt.disabled = true;
            }
        });

        // Reset selection if current selection is now invalid
        if (divisionSelect.value && !allowedDivisions.includes(divisionSelect.value)) {
            divisionSelect.value = "";
        }
    },

    // Helper to refresh grades view
    refreshGradesView() {
        const subjectId = document.getElementById('grade-subject-select').value;
        const term = document.getElementById('grade-term-select').value;
        const classValue = document.getElementById('grade-class-select').value; // Format: "Level|Classroom"

        // Parse Class Value
        let level = "";
        let classroom = "";

        if (classValue) {
            const parts = classValue.split('|');
            level = parts[0];
            classroom = parts[1];
        }

        const role = sessionStorage.getItem('edutrack_role');
        const container = document.getElementById('grades-list-container');

        // Admin Summary View Condition: Level selected, Subject NOT selected
        if (!subjectId && level && role === 'principal') {
            UI.renderPrincipalSubjectSummary('grades-list-container', term, level, classroom);
            return;
        }

        if (!subjectId || !level) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Veuillez sélectionner une classe.</div>';
            return;
        }
        UI.renderGradesTable('grades-list-container', subjectId, term, level, classroom);
    },

    normalizeLevel(input) {
        let str = input.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, ""); // Remove spaces/symbols
        if (str.startsWith("6")) return "6ème";
        if (str.startsWith("5")) return "5ème";
        if (str.startsWith("4")) return "4ème";
        if (str.startsWith("3")) return "3ème";
        if (str.includes("lyc") || str.includes("sec") || str.startsWith("2") || str.startsWith("1") || str.startsWith("t")) return "Lycée";
        return input; // Fallback
    },

    selectSubjectAndRefresh(subjectId) {
        const select = document.getElementById('grade-subject-select');
        if (select) {
            select.value = subjectId;
            this.refreshGradesView();
        }
    },

    clearSubjectAndRefresh() {
        const select = document.getElementById('grade-subject-select');
        if (select) {
            select.value = "";
            this.refreshGradesView();
        }
    },

    closeModal: () => UI.closeModal(),

    // Import Helpers
    triggerImportStudents() {
        document.getElementById('import-file').click();
    },

    handleImportStudents(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    alert("Le fichier Excel semble vide.");
                    return;
                }

                const foundHeaders = Object.keys(json[0]);
                console.log("Headers:", foundHeaders);

                let addedCount = 0;
                json.forEach((row, index) => {
                    // Robust Value Getter
                    const getVal = (searchKeys, fuzzy = false) => {
                        if (!Array.isArray(searchKeys)) searchKeys = [searchKeys];

                        // 1. Exact Match first
                        for (const key of searchKeys) {
                            const exactKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
                            if (exactKey && row[exactKey]) return row[exactKey].toString().trim();
                        }

                        // 2. Fuzzy Match (header contains keyword)
                        if (fuzzy) {
                            for (const key of searchKeys) {
                                // Skip short keys for fuzzy to avoid false positives (e.g. "id" in "ids")
                                if (key.length < 3) continue;
                                const fuzzyKey = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
                                if (fuzzyKey && row[fuzzyKey]) return row[fuzzyKey].toString().trim();
                            }
                        }
                        return '';
                    };

                    let lastName = getVal(['Nom', 'Nom de famille', 'Surname']);
                    let firstName = getVal(['Prenom', 'Prénom', 'Firstname']);

                    // Combined Name Support
                    if (!lastName) {
                        const fullName = getVal(['Nom et Prénom', 'Nom Complet', 'Nom Prénom', 'Etudiant', 'Élève', 'Eleve'], true);
                        if (fullName) {
                            const parts = fullName.split(' ');
                            lastName = parts[0];
                            firstName = parts.slice(1).join(' ') || lastName;
                        }
                    }

                    // ID - Fuzzy allowed for 'Matricule'
                    let studentId = getVal(['ID', 'Code', 'N°'], false) || getVal(['Matricule', 'Numero', 'Numéro', 'Identifiant'], true);
                    if (!studentId) {
                        studentId = `IMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
                    }

                    // Level & Division
                    let level = getVal(['Niveau', 'Level', 'Etude'], true);
                    let division = getVal(['Division', 'Div', 'Section', 'Groupe'], true);

                    // Logic: Parse "Classe" column if specific fields missing
                    if (!level || !division) {
                        const combinedClass = getVal(['Classe', 'Class'], true); // Matches "Classe", "Classement" (risk, but low context), "Ma Classe"
                        if (combinedClass) {
                            // Smart Extraction
                            // Added 7, 8, 9 to known levels to allow splitting "7ème 1" -> Level: 7ème, Div: 1 -> Normalized Level: 5ème
                            const knownLevels = ['6ème', '5ème', '4ème', '3ème', 'Lycée', '6eme', '5eme', '4eme', '3eme', 'Lycee', '7ème', '8ème', '9ème', '7eme', '8eme', '9eme', '6', '5', '4', '3', '7', '8', '9'];
                            // Sort by length desc to match "6ème" before "6"
                            knownLevels.sort((a, b) => b.length - a.length);

                            const matchedLevel = knownLevels.find(l => combinedClass.toLowerCase().includes(l.toLowerCase()));

                            if (matchedLevel) {
                                if (!level) level = matchedLevel;
                                // Remove level from string to find division
                                let remainder = combinedClass.toLowerCase().replace(matchedLevel.toLowerCase(), '').trim();
                                // Clean up punctuation
                                remainder = remainder.replace(/^[-–:.,]+/, '').trim();

                                if (!division && remainder.length > 0) {
                                    // Take the first alphanumeric non-space chunk
                                    division = remainder.split(' ')[0].toUpperCase();
                                }
                            } else {
                                // Fallback: just take the whole thing as level if simple, or assume it's level
                                if (!level) level = combinedClass;
                            }
                        }
                    }

                    // Normalize Level
                    if (level) {
                        const l = level.toLowerCase().trim();
                        // Mapping requested: 7->5, 8->4, 9->3
                        if (l.includes('7')) level = '5ème';
                        else if (l.includes('8')) level = '4ème';
                        else if (l.includes('9')) level = '3ème';
                        else if (l.includes('6')) level = '6ème';
                        else if (l.includes('5')) level = '5ème';
                        else if (l.includes('4')) level = '4ème';
                        else if (l.includes('3')) level = '3ème';
                        else if (l.includes('lyc')) level = 'Lycée';
                    }

                    // Phone: Fuzzy match on "phone", "tel", "contact", "gsm"
                    const parentPhone = getVal(['Telephone', 'Téléphone', 'Phone', 'Tel', 'GSM', 'Contact', 'Mobile', 'Tuteur', 'Parent'], true);

                    const address = getVal(['Adresse', 'Lieu', 'Habitation', 'Residence', 'Domicile'], true);

                    if (lastName) {
                        const student = {
                            lastName,
                            firstName,
                            studentId,
                            level,
                            classroom: division,
                            parentPhone,
                            address
                        };
                        Storage.addStudent(student);
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    alert(`${addedCount} élève(s) importé(s) !\n\nColonnes détectées dans le fichier :\n${foundHeaders.join(', ')}\n\nVérifiez que les données sont correctes.`);
                    this.navigate('students');
                } else {
                    alert(`Échec de l'import.\n\nColonnes trouvées :\n${foundHeaders.join(', ')}\n\nLe système cherche des colonnes contenant : "Nom", "Classe" (ou "Niveau"/"Division"), "Tel", "Adresse".`);
                }

            } catch (error) {
                console.error(error);
                alert("Erreur critique lors de la lecture du fichier.");
            }
            e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    },

    handleAddStudent(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Split Full Name
        const nameParts = data.fullName.trim().split(' ');
        data.lastName = nameParts[0];
        data.firstName = nameParts.slice(1).join(' ') || data.lastName; // Fallback if single name

        // Auto-Generate ID
        // Format: ET-{Year}-{Random4}
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        data.studentId = `ET-${year}-${random}`;

        delete data.fullName; // Clean up

        // Parse Full Class Field
        const fullClass = data.fullClass || "";

        let level = "";
        let classroom = "";

        // Attempt to extract trailing number as division
        // Matches "6ème 2", "6eme7", "Lycée A" (if alpha division needed? User said "6eme7")
        // Regex: Look for digits at the end
        const divMatch = fullClass.match(/(\d+)$/);

        if (divMatch) {
            classroom = divMatch[1];
            // Level is the part before
            let rawLevel = fullClass.substring(0, divMatch.index).trim();
            // Normalize level
            level = this.normalizeLevel(rawLevel);
        } else {
            // No number at end? Maybe just level
            level = this.normalizeLevel(fullClass);
            classroom = ""; // Or default?
        }

        data.level = level;
        data.classroom = classroom;
        delete data.fullClass;

        Storage.addStudent(data);
        this.closeModal();
        this.navigate('students');
    },

    handleAddAbsence(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const absence = Object.fromEntries(formData.entries());

        Storage.addAbsence(absence);
        this.closeModal();
        this.navigate('absences');
    },

    handleAddFee(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fee = Object.fromEntries(formData.entries());

        // Strict Validation Rule
        if (parseInt(fee.amount) !== 15000) {
            alert("Erreur : Le montant des frais de scolarité doit être exactement de 15000 FD.");
            return;
        }

        Storage.addFee(fee);
        this.closeModal();
        this.navigate('fees');
    },

    handleAddSubject(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const subject = Object.fromEntries(formData.entries());
        Storage.addSubject(subject);
        this.closeModal();
        this.navigate('subjects');
    },

    handleAddTeacher(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Split Name
        const fullName = formData.get('fullName') || '';
        const nameParts = fullName.trim().split(' ');
        const lastName = nameParts[0];
        const firstName = nameParts.slice(1).join(' ') || lastName;

        // Extract basic fields
        const teacher = {
            firstName: firstName,
            lastName: lastName,
            sex: formData.get('sex'),
            phone: formData.get('phone'),
            subjectId: formData.get('subjectId'),
        };

        // Extract classes manually
        const classFull = formData.getAll('class_full[]');
        teacher.assignedClasses = classFull.map(val => {
            const parts = val.split('|');
            return {
                level: parts[0],
                division: parts[1] || '' // Handle cases where division might be empty
            };
        }).filter(c => c.level); // Basic validation

        // Generate Credentials
        // Use prefix 'prof.'
        const creds = this.generateCredentials(teacher.lastName, teacher.firstName, 'prof.');
        teacher.username = creds.username;
        teacher.password = creds.password;

        Storage.addTeacher(teacher);
        this.closeModal();
        this.navigate('teachers');
    },

    addTeacherClassRow() {
        const container = document.getElementById('teacher-classes-container');
        if (!container) return;

        // Get existing classes dynamically
        const students = Storage.getStudents();
        const uniqueClasses = new Set();
        students.forEach(s => {
            if (s.level) {
                const div = s.classroom ? s.classroom : '';
                uniqueClasses.add(JSON.stringify({ level: s.level, classroom: div }));
            }
        });

        const options = Array.from(uniqueClasses).map(c => JSON.parse(c));
        // Sort logic
        const levelOrder = { '6ème': 6, '5ème': 5, '4ème': 4, '3ème': 3, 'Lycée': 0 };
        options.sort((a, b) => {
            const la = levelOrder[a.level] || 99;
            const lb = levelOrder[b.level] || 99;
            if (la !== lb) return lb - la; // 6eme first (big number?) No, usually 6eme is "youngest" but displayed first? Let's use standard sort
            // Actually, usually 6ème -> 3ème is ascending order of "grade".
            // Let's stick to alphabetical for now or try to match the import sort logic if visible.
            return a.level.localeCompare(b.level) || (a.classroom || '').localeCompare(b.classroom || '');
        });

        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '1fr 32px'; // Single dropdown + delete button
        div.style.gap = '8px';
        div.style.marginBottom = '8px';

        const optionsHtml = options.map(c => {
            const val = `${c.level}|${c.classroom || ''}`;
            const label = `${c.level} ${c.classroom || ''}`;
            return `<option value="${val}">${label}</option>`;
        }).join('');

        div.innerHTML = `
        <select name="class_full[]" class="form-input" style="padding: 6px; background: rgba(0,0,0,0.2); color:white;">
            <option value="">Choisir une classe existante</option>
            ${optionsHtml}
        </select>
        <button type="button" class="btn-icon" style="color: #f87171;" onclick="this.parentElement.remove()">
            <i class="ph ph-trash"></i>
        </button>
    `;
        container.appendChild(div);
    },

    generateCredentials(lastName, firstName, rolePrefix = '') {
        // Base username: lower(lastname).lower(firstname)
        // Clean accents and special chars
        const clean = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const base = `${rolePrefix}${clean(lastName)}.${clean(firstName)}`;
        const username = `${base}${Math.floor(Math.random() * 100)}`; // simple uniqueness

        // Password: 6 digits
        const password = Math.floor(100000 + Math.random() * 900000).toString();

        return { username, password };
    },

    deleteSubject(id) {
        if (confirm('Supprimer cette matière ?')) {
            Storage.deleteSubject(id);
            this.navigate('subjects');
        }
    },

    deleteTeacher(id) {
        if (confirm('Supprimer ce professeur ?')) {
            Storage.deleteTeacher(id);
            this.navigate('teachers');
        }
    },

    deleteStudent(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet élève ? Cette action est irréversible.')) {
            Storage.deleteStudent(id);
            this.navigate('students');
        }
    },

    deletePrincipal(id) {
        if (confirm('Supprimer ce principal ?')) {
            Storage.deletePrincipal(id);
            this.navigate('principals');
        }
    },

    handleSaveGrades(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const subjectId = formData.get('subjectId');
        const term = formData.get('term');

        // Check for required fields
        if (!subjectId || !term) {
            alert('Erreur: Informations de matière ou trimestre manquantes.');
            return;
        }

        // Collect grades
        const studentsData = {}; // studentId -> { values: [], average }
        let hasData = false;

        for (let [key, value] of formData.entries()) {
            if (key.startsWith('grade_')) {
                // key format: grade_{studentId}_{index}
                // Robust parsing even if studentId contains underscores
                const lastUnderscore = key.lastIndexOf('_');
                // The index is the part after the last underscore
                const indexStr = key.substring(lastUnderscore + 1);
                const index = parseInt(indexStr);

                // The studentId is everything after 'grade_' and before the last underscore
                const studentId = key.substring(6, lastUnderscore);

                if (!studentsData[studentId]) {
                    studentsData[studentId] = { values: [], average: '' };
                }
                // Ensure array size
                while (studentsData[studentId].values.length <= index) {
                    studentsData[studentId].values.push('');
                }
                studentsData[studentId].values[index] = value;
                hasData = true;

            } else if (key.startsWith('average_')) {
                // key format: average_{studentId}
                const firstUnderscore = key.indexOf('_');
                const studentId = key.substring(firstUnderscore + 1);

                if (!studentsData[studentId]) studentsData[studentId] = { values: [], average: '', appreciation: '' };
                studentsData[studentId].average = value;
            } else if (key.startsWith('appreciation_')) {
                // key format: appreciation_{studentId}
                const firstUnderscore = key.indexOf('_');
                const studentId = key.substring(firstUnderscore + 1);

                if (!studentsData[studentId]) studentsData[studentId] = { values: [], average: '', appreciation: '', competence: '' };
                studentsData[studentId].appreciation = value;
            } else if (key.startsWith('competence_')) {
                // key format: competence_{studentId}
                const firstUnderscore = key.indexOf('_');
                const studentId = key.substring(firstUnderscore + 1);

                if (!studentsData[studentId]) studentsData[studentId] = { values: [], average: '', appreciation: '', competence: '' };
                studentsData[studentId].competence = value;
            }
        }

        if (!hasData) {
            alert("DEBUG: Aucune donnée trouvée dans le formulaire ! Vérifiez que les cases ne sont pas vides.");
            console.warn("Aucune donnée de note trouvée dans le formulaire.");
            return;
        }

        const grades = Object.keys(studentsData).map(studentId => ({
            studentId,
            subjectId,
            term,
            values: studentsData[studentId].values,
            values: studentsData[studentId].values,
            average: studentsData[studentId].average,
            appreciation: studentsData[studentId].appreciation,
            competence: studentsData[studentId].competence
        }));

        // DEBUG: Show what we are about to save
        const validGrades = grades.filter(g => g.values.some(v => v !== "") || g.appreciation || g.competence);
        if (validGrades.length === 0) {
            alert("ERREUR : Le système voit des notes vides. Avez-vous bien saisi des chiffres ?");
            return;
        }

        // alert(`DEBUG: Sauvegarde de ${validGrades.length} notes pour ${subjectId} / ${term}.`);

        Storage.saveGrades(grades);

        // Immediate verify
        const check = Storage.getGrades(subjectId, term);
        // alert(`DEBUG: Vérification après sauvegarde: ${check.length} enregistrements trouvés en base.`);

        alert('✅ Notes enregistrées avec succès !');
        app.refreshGradesView();
        // Optional: refresh view to show saved state clearly
        // UI.renderGradesTable('grades-list-container', subjectId, term, document.getElementById('grade-level-select').value, document.getElementById('grade-class-select').value);
    },

    calculateRowAverage(studentId) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < 5; i++) {
            const input = document.querySelector(`input[name="grade_${studentId}_${i}"]`);
            if (input && input.value !== '') {
                sum += parseFloat(input.value);
                count++;
            }
        }

        const avgField = document.getElementById(`avg_${studentId}`);
        if (count > 0) {
            avgField.value = (sum / count).toFixed(2);
        } else {
            avgField.value = '';
        }
    },

    handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const rawUsername = formData.get('username');
        const rawPassword = formData.get('password');

        const username = rawUsername ? rawUsername.trim() : '';
        const password = rawPassword ? rawPassword.trim() : '';

        // Admin Login (Super Admin) - Case Insensitive
        if (username.toLowerCase() === 'admin' && password === '1234') {
            sessionStorage.setItem('edutrack_auth', 'true');
            sessionStorage.setItem('edutrack_role', 'superadmin');

            // Save History (Admin)
            Storage.saveLoginHistory({ username: 'Admin', firstName: 'Super', lastName: 'Admin' }, 'superadmin');

            UI.checkAuth();
            UI.navigate('principals'); // Redirect to Principals management
            return;
        }

        // Principal Login
        const principals = Storage.getPrincipals();
        const principalByUser = principals.find(p => p.username === username);
        if (principalByUser) {
            if (principalByUser.password === password) {
                sessionStorage.setItem('edutrack_auth', 'true');
                sessionStorage.setItem('edutrack_role', 'principal');
                // Ensure ID is set for Multi-Tenancy OWNER logic
                sessionStorage.setItem('edutrack_user', JSON.stringify(principalByUser));

                Storage.saveLoginHistory(principalByUser, 'principal');

                UI.checkAuth();
                UI.navigate('dashboard');
                return;
            } else {
                alert('Mot de passe incorrect pour ce principal.');
                return;
            }
        }

        // Supervisor Login
        // We use .get().supervisors because .getSupervisors() is filtered by owner
        // But for Login, we need to search ALL supervisors to find the user.
        // HOWEVER, Storage.getSupervisors() USES Current Owner, which is NOT set yet.
        // So we need raw access or a way to search globally.
        // Solution: Access Storage.get().supervisors directly for logic.
        const allSupervisors = Storage.get().supervisors || [];
        const supervisorByUser = allSupervisors.find(s => s.username === username);
        if (supervisorByUser) {
            if (supervisorByUser.password === password) {
                sessionStorage.setItem('edutrack_auth', 'true');
                sessionStorage.setItem('edutrack_role', 'supervisor');
                sessionStorage.setItem('edutrack_user', JSON.stringify(supervisorByUser));

                Storage.saveLoginHistory(supervisorByUser, 'supervisor');

                UI.checkAuth();
                UI.navigate('absences');
                return;
            } else {
                alert('Mot de passe incorrect pour ce surveillant.');
                return;
            }
        }

        // Teacher Login
        // Similarly, we need ALL teachers, not filtered ones, for login checkout
        const allTeachers = Storage.get().teachers || []; // Bypass filter

        // Debugging Aid: Case insensitive username match check
        const teacherByUsername = allTeachers.find(t => t.username.toLowerCase() === username.toLowerCase());

        if (teacherByUsername) {
            if (teacherByUsername.password === password) {
                // Success
                sessionStorage.setItem('edutrack_auth', 'true');
                sessionStorage.setItem('edutrack_role', 'teacher');
                sessionStorage.setItem('edutrack_user', JSON.stringify(teacherByUsername));

                Storage.saveLoginHistory(teacherByUsername, 'teacher');

                UI.checkAuth();
                UI.navigate('grades');
                return;
            } else {
                alert('Mot de passe incorrect pour ce professeur.');
                return;
            }
        }

        // No match found
        alert('Identifiant incorrect ou compte inexistant. Vérifiez la liste des professeurs en mode Admin.');
    },

    logout() {
        sessionStorage.removeItem('edutrack_auth');
        sessionStorage.removeItem('edutrack_role');
        sessionStorage.removeItem('edutrack_user');

        // Clear forms to prevent autofill on logout
        const usernameInput = document.querySelector('input[name="username"]');
        const passwordInput = document.querySelector('input[name="password"]');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';

        UI.closeModal();
        UI.checkAuth();
    },

    togglePasswordVisibility() {
        const input = document.getElementById('login-password');
        const icon = document.getElementById('password-toggle-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('ph-eye', 'ph-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('ph-eye-slash', 'ph-eye');
        }
    },

    renderLoginHistory() {
        const history = Storage.getLoginHistory();
        const usernameInput = document.querySelector('input[name="username"]');
        if (!usernameInput) return;

        const formGroup = usernameInput.closest('.form-group');
        let container = document.getElementById('login-history-dropdown');

        // Create container if not exists
        if (!container) {
            container = document.createElement('div');
            container.id = 'login-history-dropdown';
            container.className = 'history-dropdown hidden';
            formGroup.style.position = 'relative'; // Ensure parent is relative
            formGroup.appendChild(container);

            // Add Focus Listener to Input
            usernameInput.addEventListener('focus', () => {
                const updatedHistory = Storage.getLoginHistory();
                if (updatedHistory.length > 0) {
                    container.classList.remove('hidden');
                }
            });

            // Add Click Outside Listener
            document.addEventListener('click', (e) => {
                if (!formGroup.contains(e.target) && e.target !== usernameInput) {
                    container.classList.add('hidden');
                }
            });
        }

        if (history.length === 0) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = `
            ${history.map(u => {
            // Avatar logic
            let avatarHtml = `<div class="history-avatar-placeholder" style="width: 28px; height: 28px; font-size: 10px;">${u.firstName.charAt(0)}${u.lastName.charAt(0)}</div>`;
            if (u.avatar) {
                avatarHtml = `<img src="${u.avatar}" class="history-avatar-img" style="width: 28px; height: 28px;">`;
            } else if (u.username === 'Admin') {
                avatarHtml = `<div class="history-avatar-placeholder" style="width: 28px; height: 28px; background: var(--primary); font-size: 10px;"><i class="ph-fill ph-check-shield"></i></div>`;
            }

            return `
                <div class="history-item-dropdown" onclick="app.fillLogin('${u.username}')">
                    <div class="history-avatar" style="width: 28px; height: 28px;">
                        ${avatarHtml}
                    </div>
                    <div class="history-info">
                        <div class="history-name" style="font-size: 12px;">${u.firstName} ${u.lastName}</div>
                        <div class="history-role" style="font-size: 10px;">${u.username}</div>
                    </div>
                    <button type="button" class="history-remove" onclick="app.removeHistory(event, '${u.username}')" style="width: 20px; height: 20px;">
                        <i class="ph-bold ph-x" style="font-size: 12px;"></i>
                    </button>
                </div>
                `;
        }).join('')}
        `;

        // Remove old container if exists
        const oldContainer = document.getElementById('login-history-container');
        if (oldContainer) oldContainer.remove();
    },

    fillLogin(username) {
        document.querySelector('input[name="username"]').value = username;
        document.querySelector('input[name="password"]').focus();
        const dropdown = document.getElementById('login-history-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    },

    removeHistory(e, username) {
        e.stopPropagation();
        Storage.removeLoginHistory(username);
        this.renderLoginHistory();
        // Keep dropdown open if items remain
        const updated = Storage.getLoginHistory();
        if (updated.length > 0) {
            const dropdown = document.getElementById('login-history-dropdown');
            if (dropdown) dropdown.classList.remove('hidden');
            document.querySelector('input[name="username"]').focus();
        }
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    Storage.migrateData(true); // Auto–correct legacy levels on startup (SILENTLY)
    app.init();
    app.renderLoginHistory();
    // Clear inputs to prevent autofill
    document.querySelector('input[name="username"]').value = '';
    document.querySelector('input[name="password"]').value = '';
});
