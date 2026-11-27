<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Admin → Settings → "Send test email": proves email works and shows the real Easy Peasy design,
 * with example ticket numbers and money rows (clearly marked as an example, never a real order).
 */
class TestEmail extends Notification
{
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $site = rtrim((string) config('app.frontend_url'), '/');

        return (new MailMessage)->subject('Easy Peasy Test Email')
            ->greeting('Email is working!')
            ->line('This is a test from the Easy Peasy admin. If you can read it, emails are being sent. Below is an example of how ticket numbers and totals look in an order email. It isn’t a real order.')
            ->markdown('notifications::email', ['blocks' => [
                ['tickets', 'Example Competition', '6 tickets · 3 paid + 3 free', [104, 377, 1208, 2045, 2911, 3650]],
                ['rows', [['Order', 'EP-EXAMPLE'], ['From your wallet', '£1.00'], ['By card', '£0.77']], 'Total', '£1.77'],
            ]])
            ->action('Visit Easy Peasy', $site)
            ->line('18+ UK only. Please play responsibly.')
            ->salutation('The Easy Peasy team');
    }
}
