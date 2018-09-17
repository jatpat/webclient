(function(scope) {
    var options = {};

    /*jshint -W074*/
    // ^ zxcvbn stuff..

    function closeRegisterDialog($dialog, isUserTriggered) {
        closeDialog();
        $(window).unbind('resize.proregdialog');
        $('.fm-dialog-overlay').unbind('click.proDialog');
        $('.fm-dialog-close', $dialog).unbind('click.proDialog');

        if (isUserTriggered && options.onDialogClosed) {
            options.onDialogClosed($dialog);
        }

        delete $.registerDialog;

        options = {};
    }

    function doProRegister($dialog) {

        var rv = {};
        var hideOverlay = function() {
            loadingDialog.hide();
            $dialog.removeClass('arrange-to-back');
        };

        if (options.onCreatingAccount) {
            options.onCreatingAccount($dialog);
        }
        loadingDialog.show();
        $dialog.addClass('arrange-to-back');

        if (u_type > 0) {
            hideOverlay();
            msgDialog('warninga', l[135], l[5843]);
            return false;
        }

        var registrationDone = function(login) {

            var onAccountCreated = options.onAccountCreated;

            hideOverlay();
            closeRegisterDialog($dialog);
            $('.fm-dialog.registration-page-success').unbind('click');

            if (login) {
                Soon(function() {
                    showToast('megasync', l[8745]);
                    $('.fm-avatar img').attr('src', useravatar.mine());
                });
            }
            onIdle(topmenuUI);

            if (typeof onAccountCreated === 'function') {
                onAccountCreated(login, rv);
            }
            else {
                // $('.fm-dialog.registration-page-success').removeClass('hidden');
                // fm_showoverlay();
                // ^ legacy confirmation dialog, with no email change option
                sendSignupLinkDialog(rv);
            }
        };

        /**
         * When the user has an account already, show them the Pro Login dialog instead so they can log in
         */
        var redirectToProLoginForExistingAccount = function() {

            // Log out the ephemeral account that was created
            u_logout();

            // Close the Pro register dialog, pre-set email and password into the Pro login dialog
            closeRegisterDialog($dialog, false);
            showLoginDialog(rv.email, rv.password);

            // Show a message dialog telling them to log in
            msgDialog('warninga', l[882], l[1783], l[1768]);
        };

        /**
         * Continue the old method Pro registration
         * @param {Number} result The result of the 'uc' API request
         */
        var continueOldProRegistration = function(result) {

            if (result === 0) {
                var ops = {
                    a: 'up'
                };

                ops.terms = 'Mq';
                ops.firstname = base64urlencode(to8(rv.first));
                ops.lastname = base64urlencode(to8(rv.last));
                ops.name2 = base64urlencode(to8(rv.name));
                u_attr.terms = 1;

                api_req(ops);
                registrationDone();
            }
            else if (result === EACCESS || result === EEXIST) {
                redirectToProLoginForExistingAccount();
            }
            else {
                hideOverlay();
                msgDialog('warninga', 'Error', l[200], result);
            }
        };

        /**
         * Continue the new method registration
         * @param {Number} result The result of the 'uc2' API request
         */
        var continueNewProRegistration = function(result) {

            if (result === 0) {
                registrationDone();
            }
            else if (result === EACCESS || result === EEXIST) {
                redirectToProLoginForExistingAccount();
            }
            else {
                loadingDialog.hide();
                msgDialog('warninga', l[1578], l[200], result);
            }
        };

        /**
         * The main function to register the account
         */
        var registeraccount = function() {

            rv.password = $('#register-password', $dialog).val();
            rv.first = $('#register-firstname', $dialog).val();
            rv.last = $('#register-lastname', $dialog).val();
            rv.email = $('#register-email', $dialog).val();
            rv.name = rv.first + ' ' + rv.last;

            // Set a flag that the registration came from the Pro page
            var fromProPage = true;

            // Set the signup function to start the new secure registration process
            if (security.register.newRegistrationEnabled()) {
                security.register.startRegistration(rv.first, rv.last, rv.email, rv.password,
                                                    fromProPage, continueNewProRegistration);
            }
            else {
                // Set the signup function to use the legacy registration process
                sendsignuplink(rv.name, rv.email, rv.password, { callback: continueOldProRegistration }, fromProPage);
            }
        };

        var err = false;
        var $formWrapper = $dialog.find('form');
        var $firstName = $('.input-wrapper.name .f-name', $formWrapper);
        var $lastName = $('.input-wrapper.name .l-name', $formWrapper);
        var $email = $('.input-wrapper.email input', $formWrapper);
        var $password = $('.input-wrapper.first input', $formWrapper);
        var $passwordConfirm = $('.input-wrapper.confirm input', $formWrapper);

        var firstName = $.trim($firstName.val());
        var lastName = $.trim($lastName.val());
        var email = $.trim($email.val());
        var password = $.trim($password.val());
        var passwordConfirm = $.trim($passwordConfirm.val());

        if (password !== passwordConfirm) {
            $password.parent().find('.account.password-stutus').removeClass('checked');
            $password.val('');
            $passwordConfirm.val('');
            $passwordConfirm.parent().addClass('incorrect');
            $passwordConfirm.focus();
            err = 1;
        }

        if (password === '') {
            $password.parent().addClass('incorrect');
            $password.focus();
            $password.parent().find('.account.input-tooltip')
                .safeHTML(l[1102] + '<br>' + l[213]);
            err = 1;
        }
        else if (password.length < security.minPasswordLength) {
            $password.parent().addClass('incorrect');
            $password.focus();
            $password.parent().find('.account.input-tooltip')
                .safeHTML(l[1102] + '<br>' + l[18701]);
            err = 1;
        }
        else if (typeof zxcvbn !== 'undefined') {
            var pw = zxcvbn(password);
            if (pw.score < 1) {
                $password.parent().addClass('incorrect');
                $password.focus();
                $password.parent().find('.account.input-tooltip')
                    .safeHTML(l[1102] + '<br>' + l[1104]);
                err = 1;
            }
        }

        if (email === '' || checkMail(email)) {
            $email.parent().addClass('incorrect');
            $email.focus();
            err = 1;
        }

        if (firstName === '' || lastName === '') {
            $firstName.parent().addClass('incorrect');
            $firstName.focus();
            err = 1;
        }

        if (!err && typeof zxcvbn === 'undefined') {
            msgDialog('warninga', l[135], l[1115] + '<br>' + l[1116]);
            return false;
        }
        else if (!err) {
            if ($('.register-check', $dialog).hasClass('checkboxOff')) {
                hideOverlay();
                msgDialog('warninga', l[1117], l[1118]);
            }
            else {
                if (u_type === false) {
                    hideOverlay();
                    u_storage = init_storage(localStorage);
                    u_checklogin({
                        checkloginresult: function(u_ctx, r) {
                            u_type = r;
                            registeraccount();
                        }
                    }, true);
                }
                else if (u_type === 0) {
                    registeraccount();
                }
            }
        }
        if (err) {
            hideOverlay();
        }
    }

    function showRegisterDialog(opts) {
        var $dialog = $('.fm-dialog.pro-register-dialog');
        var $inputs = $dialog.find('.account.input-wrapper input');
        var $button = $dialog.find('.big-red-button');
        var $password = $dialog.find('.account.input-wrapper.password input');

        var dialogBodyScroll = function() {
            var bodyHeight = $('body').height();
            var $scrollBlock =  $('.pro-register-scroll', $dialog);
            var scrollBlockHeight = $scrollBlock.height();
            $scrollBlock.css({
                'max-height': bodyHeight - 100
            });

            if (scrollBlockHeight + 140 > bodyHeight) {
                $scrollBlock.jScrollPane({
                    enableKeyboardNavigation: false,
                    showArrows: true,
                    arrowSize: 5,
                    animateScroll: true
                });
            }
            else {
                deleteScrollPanel('.pro-register-scroll', 'jsp');
                $scrollBlock.removeAttr('style');
            }
        };

        var reposition = function() {
            $dialog.css({
                'margin-left': -1 * ($dialog.outerWidth() / 2),
                'margin-top': -1 * ($dialog.outerHeight() / 2)
            });
        };

        var redraw = function() {
            onIdle(function() {
                dialogBodyScroll();
                reposition();
            });
        };

        M.safeShowDialog('register', function() {
            options = Object(opts);

            $('.fm-dialog-title', $dialog).text(options.title || l[5840]);

            if (options.body) {
                $('.fm-dialog-body', $dialog).safeHTML(options.body);
            }

            redraw();
            $('.pro-register-scroll', $dialog).removeAttr('style');
            $(window).rebind('resize.proregdialog', redraw);
            deleteScrollPanel('.pro-register-scroll', 'jsp');

            // Init inputs events
            accountinputs.init($dialog);

            $.registerDialog = 'register';

            return $dialog;
        });

        $inputs.val('');
        $password.parent().find('.password-stutus').removeClass('checked');

        // controls
        $('.fm-dialog-close', $dialog).rebind('click.proDialog', function() {
            closeRegisterDialog($dialog, true);
            return false;
        });

        // close dialog by click on overlay
        $('.fm-dialog-overlay').rebind('click.proDialog', function() {
            if ($.registerDialog === $.dialog) {
                closeRegisterDialog($dialog, true);
            }
            else {
                closeDialog();
            }
            return false;
        });

        var registerpwcheck = function() {
            $('.account.password-stutus', $dialog)
                .removeClass('good1 good2 good3 good4 good5 checked');

            var $passwordInput = $('#register-password', $dialog);
            var password = $.trim($passwordInput.val());

            if (typeof zxcvbn === 'undefined'
                    || $passwordInput.attr('type') === 'text'
                    || password === '') {
                return false;
            }

            classifyPassword(password);
            reposition();
            dialogBodyScroll();
        };

        if (typeof zxcvbn === 'undefined') {
            $('.account.input-wrapper.password', $dialog).addClass('loading');

            M.require('zxcvbn_js')
                .done(function() {
                    $('.account.input-wrapper.password', $dialog).removeClass('loading');
                    registerpwcheck();
                });
        }

        $password.first().rebind('keyup.proRegister', function(e) {
            registerpwcheck();
        });

        $inputs.rebind('keydown.proRegister', function(e) {
            if (e.keyCode === 13) {
                doProRegister($dialog);
            }
        });

        $button.rebind('click.proRegister', function(e) {
            doProRegister($dialog);
            return false;
        });

        $button.rebind('keydown.proRegister', function (e) {
            if (e.keyCode === 13) {
                doProRegister($dialog);
                return false;
            }
        });

        $('.checkbox-block.register .radio-txt', $dialog).safeHTML(l['208s']);

        $('.checkbox-block.register span', $dialog).rebind('click', function(e) {
            e.preventDefault();
            $.termsAgree = function() {
                $('.register-check', $dialog).removeClass('checkboxOff')
                    .addClass('checkboxOn');
            };
            $.termsDeny = function() {
                $('.register-check', $dialog).removeClass('checkboxOn')
                    .addClass('checkboxOff');
            };
            bottomPageDialog(false, 'terms'); // show terms dialog
            return false;
        });
    }

    /**
     * Send Signup link dialog
     * @param {Object} accountData The data entered by the user at registration
     * @param {Function} onCloseCallback Optional callback to invoke on close
     */
    function sendSignupLinkDialog(accountData, onCloseCallback) {
        var $dialog = $('.fm-dialog.registration-page-success').removeClass('hidden');
        var $button = $('.resend-email-button', $dialog);

        $('input', $dialog).val(accountData.email);

        $button.rebind('click', function _click() {
            var ctx = {
                callback: function(res) {
                    loadingDialog.hide();

                    if (res !== 0) {
                        console.error('sendsignuplink failed', res);

                        $button.addClass('disabled');
                        $button.unbind('click');

                        var tick = 26;
                        var timer = setInterval(function() {
                            if (--tick === 0) {
                                clearInterval(timer);
                                $button.text(l[8744]);
                                $button.removeClass('disabled');
                                $button.rebind('click', _click);
                            }
                            else {
                                $button.text('\u23F1 ' + tick + '...');
                            }
                        }, 1000);

                        alert(l[200]);
                    }
                    else {
                        closeDialog();
                        fm_showoverlay();

                        $dialog.removeClass('hidden');
                    }
                }
            };
            loadingDialog.show();

            var newEmail = $.trim($('input', $dialog).val()) || accountData.email;

            // If the new registration method is enabled, re-send the signup link using the new method
            if (security.register.newRegistrationEnabled()) {
                security.register.repeatSendSignupLink(newEmail, ctx.callback);
            }
            else {
                // Otherwise use the old method
                sendsignuplink(accountData.name, newEmail, accountData.password, ctx, true);
            }
        });

        if (typeof onCloseCallback === 'function') {
            // Show dialog close button
            $('.fm-dialog-header', $dialog).removeClass('hidden');

            $('.fm-dialog-close', $dialog).rebind('click', function _click() {

                msgDialog('confirmation', l[1334], l[5710], false, function(ev) {

                    // Confirm abort registration
                    if (ev) {
                        onCloseCallback();
                    }
                    else {
                        // Restore the background overlay which was closed by the msgDialog function
                        fm_showoverlay();
                    }
                });
            });
        }
        else {
            // Hide dialog close button
            $('.fm-dialog-header', $dialog).addClass('hidden');
        }

        fm_showoverlay();
        $dialog.addClass('special').show();
    }

    // export
    scope.mega.ui.showRegisterDialog = showRegisterDialog;
    scope.mega.ui.sendSignupLinkDialog = sendSignupLinkDialog;

})(this);
