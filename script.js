let tasks =
    JSON.parse(localStorage.getItem("nexusTasks")) || [

    {
        id: 1,
        name: "Compiler Design Assignment",
        subject: "Compiler Design",
        deadline: "2026-10-14",
        importance: 10,
        difficulty: 8,
        progress: 30,
        completed: false
    },

    {
        id: 2,
        name: "HCI Unit 3 Preparation",
        subject: "Human Computer Interaction",
        deadline: "2026-10-17",
        importance: 7,
        difficulty: 6,
        progress: 65,
        completed: false
    },

    {
        id: 3,
        name: "Information Theory Notes",
        subject: "Information Theory",
        deadline: "2026-10-20",
        importance: 5,
        difficulty: 5,
        progress: 100,
        completed: true
    }
];


/* -------------------------
   PRIORITY ENGINE
------------------------- */

function calculatePriority(task) {

    const today = new Date();

    const deadline =
        new Date(task.deadline);

    const daysLeft =
        (deadline - today) /
        (1000 * 60 * 60 * 24);


    const urgency =
        Math.max(
            0,
            Math.min(
                100,
                100 - daysLeft * 8
            )
        );


    const importance =
        task.importance * 10;


    const difficulty =
        task.difficulty * 10;


    const remaining =
        100 - task.progress;


    /*
        Weighted algorithm

        Urgency       35%
        Importance    30%
        Difficulty    15%
        Remaining     20%
    */

    const score =
        urgency * .35 +
        importance * .30 +
        difficulty * .15 +
        remaining * .20;


    return {

        score: Math.round(score),

        urgency: Math.round(urgency),

        importance,

        difficulty
    };
}


/* -------------------------
   RENDER TASKS
------------------------- */

function renderTasks() {

    const container =
        document.getElementById("taskList");

    container.innerHTML = "";


    tasks.sort(
        (a, b) =>
            calculatePriority(b).score -
            calculatePriority(a).score
    );


    tasks.forEach(task => {

        const priority =
            calculatePriority(task);


        let level = "low";


        if(priority.score >= 75) {

            level = "high";

        } else if(priority.score >= 50) {

            level = "medium";

        }


        const element =
            document.createElement("div");


        element.className = "task";


        element.innerHTML = `

            <div class="task-title">
                ${task.name}
            </div>

            <div class="task-subject">
                ${task.subject}
            </div>

            <div class="task-info">

                <span>
                    Due: ${task.deadline}
                </span>

                <span class="priority ${level}">
                    Priority ${priority.score}
                </span>

            </div>

            <div class="progress">

                <div
                    style="width:${task.progress}%">
                </div>

            </div>

            <div class="task-info">

                <span>
                    Progress: ${task.progress}%
                </span>

                <span>
                    ${task.completed
                        ? "✓ Completed"
                        : "In Progress"}
                </span>

            </div>

        `;


        container.appendChild(element);

    });


    updateDashboard();
}


/* -------------------------
   DASHBOARD
------------------------- */

function updateDashboard() {

    const total =
        tasks.length;


    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    const risky =
        tasks.filter(
            task =>
                calculatePriority(task).score >= 75
        ).length;


    document.getElementById(
        "totalTasks"
    ).textContent = total;


    document.getElementById(
        "completedTasks"
    ).textContent = completed;


    document.getElementById(
        "riskTasks"
    ).textContent = risky;


    if(tasks.length === 0)
        return;


    const highest =
        [...tasks].sort(
            (a,b) =>
                calculatePriority(b).score -
                calculatePriority(a).score
        )[0];


    const data =
        calculatePriority(highest);


    document.getElementById(
        "priorityScore"
    ).textContent = data.score;


    setMetric(
        "urgency",
        data.urgency
    );


    setMetric(
        "importance",
        data.importance
    );


    setMetric(
        "difficulty",
        data.difficulty
    );
}


function setMetric(name, value) {

    document.getElementById(
        name + "Value"
    ).textContent = value + "%";


    document.getElementById(
        name + "Bar"
    ).style.width = value + "%";
}


/* -------------------------
   MODAL
------------------------- */

const modal =
    document.getElementById("taskModal");


document.getElementById(
    "openModal"
).addEventListener(
    "click",
    () => {

        modal.style.display = "flex";

    }
);


document.getElementById(
    "closeModal"
).addEventListener(
    "click",
    () => {

        modal.style.display = "none";

    }
);


/* -------------------------
   CREATE TASK
------------------------- */

document.getElementById(
    "createTask"
).addEventListener(
    "click",
    createTask
);


function createTask() {

    const name =
        document.getElementById(
            "taskName"
        ).value.trim();


    const subject =
        document.getElementById(
            "taskSubject"
        ).value.trim();


    const deadline =
        document.getElementById(
            "taskDeadline"
        ).value;


    const importance =
        Number(
            document.getElementById(
                "taskImportance"
            ).value
        );


    const difficulty =
        Number(
            document.getElementById(
                "taskDifficulty"
            ).value
        );


    if(
        !name ||
        !subject ||
        !deadline
    ) {

        alert(
            "Please complete all fields."
        );

        return;
    }


    const newTask = {

        id: Date.now(),

        name,

        subject,

        deadline,

        importance,

        difficulty,

        progress: 0,

        completed: false
    };


    tasks.push(newTask);


    saveTasks();


    renderTasks();


    modal.style.display = "none";


    clearForm();
}


/* -------------------------
   STORAGE
------------------------- */

function saveTasks() {

    localStorage.setItem(
        "nexusTasks",
        JSON.stringify(tasks)
    );

}


function clearForm() {

    document.getElementById(
        "taskName"
    ).value = "";


    document.getElementById(
        "taskSubject"
    ).value = "";


    document.getElementById(
        "taskDeadline"
    ).value = "";

}


/* -------------------------
   START APPLICATION
------------------------- */

renderTasks();