$(document).ready(function () {
  const url = 'http://localhost:3000/';

  // Load header
  $('#header').load('/header_admin.html', function() {
    // Admin check
    $.ajax({
      url: 'http://localhost:3000/api/auth/admin-check',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || ''),
        'X-Tab-Context': 'admin'
      },
      success: function(res) {
        console.log('✅ Admin verified:', res.user);
        
        // TAB CONTEXT VERIFICATION
        if (sessionStorage.getItem('tabRole') !== 'admin') {
          alert('⚠️ Security Alert: Please access categories through admin interface');
          logoutAdmin();
          return;
        }
      },
      error: function(xhr) {
        const defaultMsg = "Only admins can access this page.";
        const message = xhr.responseJSON?.message || defaultMsg;
        
        if (xhr.status === 403 && message.includes('interface')) {
          alert('🔒 Admin account detected - redirecting to admin portal');
          window.location.href = '/home_admin.html';
        } else if (xhr.status === 401) {
          alert('⌛ Session expired - please login again');
          logoutAdmin();
        } else {
          alert(message);
          logoutAdmin();
        }
      }
    });
  });

  function logoutAdmin() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    sessionStorage.removeItem('tabRole');
    window.location.href = '/login.html';
  }

  // Initialize Categories DataTable
  const table = $('#ctable').DataTable({
    ajax: {
      url: `${url}api/category/admin/all`,
      dataSrc: "data",
    },
    dom: 'rtip',
    buttons: [
      {
        extend: 'pdf',
        text: '<i class="fas fa-file-pdf"></i> PDF',
        className: 'btn btn-outline-danger mr-2'
      }
    ],
    columns: [
      { data: 'category_id' },
      { data: 'description' },
      {
        data: null,
        render: function (data) {
          let btns = `
            <div class="action-icons">
              <a href='#' class='editCategoryBtn' data-id="${data.category_id}" title="Edit">
                <i class='fas fa-edit'></i>
              </a>
              <a href='#' class='deleteCategoryBtn' data-id="${data.category_id}" title="Delete">
                <i class='fas fa-trash-alt'></i>
              </a>`;
          if (data.deleted_at) {
            btns += `
              <a href='#' class='unarchiveCategoryBtn' data-id="${data.category_id}" title="Restore">
                <i class='fas fa-undo'></i>
              </a>`;
          }
          return btns + '</div>';
        }
      }
    ]
  });

  // PDF export button
  $('#pdfExportBtn').click(function() {
    table.button('.buttons-pdf').trigger();
  });

  // Add Category button handler
  $('#addCategoryBtn').click(function() {
    resetAndShowModal();
  });

  // View mode toggle functionality
  $('.pagination-mode').click(function() {
    $('.view-mode-toggle .btn').removeClass('active');
    $(this).addClass('active');
    // Implement pagination mode logic here
    table.page.len(10).draw(); // Set to show 10 items per page
    $('#ctable').parent().css('overflow-y', 'hidden');
    console.log('Pagination mode activated');
  });

  $('.infinite-scroll-mode').click(function() {
    $('.view-mode-toggle .btn').removeClass('active');
    $(this).addClass('active');
    // Implement infinite scroll mode logic here
    table.page.len(-1).draw(); // Show all items
    $('#ctable').parent().css('overflow-y', 'auto').css('max-height', '500px');
    console.log('Infinite scroll mode activated');
  });

  // Initialize with pagination mode
  $('.pagination-mode').click();

  // Search functionality
  $('#searchButton').on('click', function() {
    table.search($('#categorySearch').val()).draw();
    $(this).addClass('animate__animated animate__pulse');
    setTimeout(() => $(this).removeClass('animate__animated animate__pulse'), 1000);
  });

  $('#categorySearch').on('keyup', function(e) {
    if (e.keyCode === 13) {
      table.search($(this).val()).draw();
      $('#searchButton').addClass('animate__animated animate__pulse');
      setTimeout(() => $('#searchButton').removeClass('animate__animated animate__pulse'), 1000);
    }
  });

  // Modal handling functions
  function resetAndShowModal() {
    $("#cform").trigger("reset");
    $('#categoryModal').modal({ backdrop: 'static', keyboard: false }).modal('show');
    $('#categoryUpdate').hide();
    $('#categorySubmit').show();
    $('#categoryId').remove();
    $('#category_description').val('').focus();
  }

  function closeModal() {
    $('#categoryModal').modal('hide');
  }

  // Modal close handlers
  $(document).on('click', '[data-dismiss="modal"], .modal-footer .btn-secondary', function() {
    closeModal();
  });

  // Submit new category
  $("#categorySubmit").on('click', function (e) {
    e.preventDefault();
    const formData = { description: $('#category_description').val() };

    if (!formData.description.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please enter a category description'
      });
      return;
    }

    $.ajax({
      method: "POST",
      url: `${url}api/category`,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function () {
        closeModal();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Category created successfully'
        });
        table.ajax.reload(null, false);
      },
      error: function (err) {
        console.log(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.responseJSON?.error || "Error creating category"
        });
      }
    });
  });

  // Edit category button
  $('#ctable tbody').on('click', 'a.editCategoryBtn', function (e) {
    e.preventDefault();
    resetAndShowModal();
    
    const id = $(this).data('id');
    $('<input>').attr({ type: 'hidden', id: 'categoryId', name: 'category_id', value: id }).appendTo('#cform');
    $('#categorySubmit').hide();
    $('#categoryUpdate').show();

    $.ajax({
      method: "GET",
      url: `${url}api/category/${id}`,
      dataType: "json",
      success: function (data) {
        const { result } = data;
        $('#category_description').val(result[0].description).focus();
      },
      error: function () {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load category data'
        });
        closeModal();
      }
    });
  });

  // Update category
  $("#categoryUpdate").on('click', function (e) {
    e.preventDefault();
    const id = $('#categoryId').val();
    const formData = { description: $('#category_description').val() };

    if (!formData.description.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please enter a category description'
      });
      return;
    }

    $.ajax({
      method: "PUT",
      url: `${url}api/category/${id}`,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function () {
        closeModal();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Category updated successfully'
        });
        table.ajax.reload(null, false);
      },
      error: function (xhr) {
        const errorMessage = xhr.responseJSON?.error || "Error updating category";
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage
        });
      }
    });
  });

  // Delete category
  $('#ctable tbody').on('click', 'a.deleteCategoryBtn', function (e) {
    e.preventDefault();
    const id = $(this).data('id');

    Swal.fire({
      title: 'Are you sure?',
      text: "This category will be archived. You can restore it later.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, archive it!'
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          method: "DELETE",
          url: `${url}api/category/${id}`,
          success: function (data) {
            table.ajax.reload(null, false);
            Swal.fire(
              'Archived!',
              'The category has been archived.',
              'success'
            );
          },
          error: function (xhr) {
            const errorMessage = xhr.responseJSON?.error || "Error archiving category";
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: errorMessage
            });
          }
        });
      }
    });
  });

  // Restore category
  $('#ctable tbody').on('click', 'a.unarchiveCategoryBtn', function (e) {
    e.preventDefault();
    const id = $(this).data('id');

    Swal.fire({
      title: 'Are you sure?',
      text: "This category will be restored.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore it!'
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          method: "PUT",
          url: `${url}api/category/restore/${id}`,
          success: function () {
            table.ajax.reload(null, false);
            Swal.fire(
              'Restored!',
              'The category has been restored.',
              'success'
            );
          },
          error: function (xhr) {
            const errorMessage = xhr.responseJSON?.error || "Error restoring category";
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: errorMessage
            });
          }
        });
      }
    });
  });

  window.addEventListener('storage', function(event) {
    // Handle logout from other tabs
    if (event.key === 'token' && event.newValue === null) {
      alert('🔐 Session ended in another tab');
      logoutAdmin();
    }
    
    // Handle role changes
    if (event.key === 'role' && event.newValue !== 'admin') {
      alert('⚡ Account type changed - redirecting...');
      logoutAdmin();
    }
  });
});



    // Load footer
    $(document).ready(function() {
        $('#footer').load('/footer_admin.html');
    });