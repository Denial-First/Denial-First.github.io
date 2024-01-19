let join_form = document.getElementById('join-form')

join_form.addEventListener('submit', (e) => {
    e.preventDefault()
    let name = e.target.username.value
    let conf_id = e.target.conference.value
    sessionStorage.setItem('username', name)
    window.location = `conf.html?conf=${conf_id}`

    // if (localStorage.getItem('username') === name)
    //     {
    //         window.location = `index.html`
    //     }
    // // зробити валідацію чи є ім'я
    // else {
    //     sessionStorage.setItem('username', name)
    //     let conf_id = e.target.conference.value
    //     window.location = `conf.html?conf=${conf_id}`
    // }
        
})

